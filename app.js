const express = require("express");
const app = express();
var csrf = require("tiny-csrf");
const { Admin, Election, Question, Answer,Voter } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const { request } = require("http");

const saltRounds = 10;

app.use(bodyParser.json());

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));


app.use(
  session({
    secret: "my-super-secret-key-24567854323456724",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          return done(error);
        });
    }
  )
);


passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  Admin.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});
app.get("/", (request, response) => {
    response.render("index")
})

app.get("/login",(request,response) => {
        response.render("login", {
          title: "Login",
          csrfToken: request.csrfToken(),
        });
})

app.post(
    "/session",
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    (request, response) => {
      console.log(request.user);
      response.redirect("/elections");
    }
  );

app.get("/signup",(request,response) => {
    response.render("signup", {
        title: "Signup",
        csrfToken: request.csrfToken(),
    })
})

app.post("/users", async (request,response) => {
    const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
    try {
        const admin = await Admin.create({
            firstName: request.body.firstName, 
            lastName: request.body.lastName, 
            email: request.body.email, 
            password: hashedPwd, 
        })
        request.login(admin, (err) => {
            if (err) {
              console.log(err);
            }
            response.redirect("/elections");
          });
    } catch (error) {
        console.log(error);
    }
})

app.get("/elections",connectEnsureLogin.ensureLoggedIn(), async (request,response) => {
    const electionsList = await Election.getAllElections(request.user.id)
    console.log(electionsList);
    response.render("elections",{
        userName:`${request.user.firstName} ${request.user.lastName}`,
        electionsList
    })
})

app.get("/elections/new",async (request,response)=>{
        
        response.render("newElection",{csrfToken: request.csrfToken()})
})

app.post("/elections/new",(request,response)=>{
    try{
        const newElection= Election.addElection({electionName:request.body.electionName,adminId:request.user.id})
        response.redirect("/elections")

    } catch{
        response.redirect("electionss.new")
    }
})

app.get("/elections/:id",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
    const election= await Election.findByPk(request.params.id)
    console.log(election);
    const questions=await Question.getAllQuestions(request.params.id)
    const questionsCount = questions.length
    const voters=await Voter.getAllVoters(request.params.id)
    const votersCount = voters.length
    response.render("electionpage",{questionsCount,votersCount,election})
})

app.get("/elections/:id/questions",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
    const questionsList = await Question.getAllQuestions(request.params.id)
    const election = await Election.findByPk(request.params.id)
    response.render("questions",{questionsList,election})
})
app.get("/elections/:id/voters",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
    const votersList = await Voter.getAllVoters(request.params.id)
    const election = await Election.findByPk(request.params.id)
    response.render("voters",{votersList,election})
})

app.get("/elections/:id/questions/new",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
  const election=await Election.findByPk(request.params.id)
    response.render("newQuestions",{csrfToken:request.csrfToken(),election})
})

app.post("/elections/:id/questions/new",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
  const newQuestion=await Question.addQuestion({
    questionName:request.body.questionName,
    questionDescription:request.body.questionDescription,
    electionId:request.params.id
  })
  response.redirect(`/elections/${request.params.id}/questions`)
})

app.get("/elections/:id/voters/new",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
    const election=await Election.findByPk(request.params.id)
    response.render("newVoters",{csrfToken:request.csrfToken(),election})
})

app.post("/elections/:id/voters/new",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
  const hashedPwd= await bcrypt.hash(request.body.password,saltRounds)
  const newVoter=await Voter.addVoter({
    voterId:request.body.voterId,
    password:hashedPwd,
    electionId:request.params.id
  })
  console.log(newVoter);
  response.redirect(`/elections/${request.params.id}/voters`)
})

app.get("/elections/:eid/questions/:qid",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
    const question= await Question.findByPk(request.params.qid)
    const answersList = await Answer.getAnswers(question.id)
    const election = await Election.findByPk(request.params.eid)
    response.render("questionPage",{csrfToken:request.csrfToken(),question,answersList,election})
})

app.post("/elections/:eid/questions/:qid",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
  const answer=await Answer.addAnswer({
    answerName:request.body.answerName,
    questionId:request.params.qid
  })
  console.log(answer);
  response.redirect(`/elections/${request.params.eid}/questions/${request.params.qid}`)
})



module.exports = app;
