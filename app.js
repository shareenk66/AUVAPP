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

//middlewares
function ensureVoterLoggedIn(){
  return (request,response,next)=>{
    if(request.user && request.user.voterId){
      next()
    }else{
      response.redirect(`/elections/${request.params.id}/loginVoter`)
    }
  }
}

function canVote(){
  return async (request,response,next)=>{
    const voter = await Voter.findByPk(request.user.id)
    if(!voter.voteStatus){
      next()
    }else{
      console.log("already casted vote");
      response.redirect(`/elections/${request.params.id}/loginVoter`)
    }
  }
}



passport.use("admin-local",
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
passport.use(
  "voter-local",
  new LocalStrategy(
    {
      usernameField: "voterId",
      passwordField: "password",
      passReqToCallback:true,
    },
    (request,voterId, password, done) => {
      Voter.findOne({ where: { voterId,electionId:request.params.id } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);

          if (result) {
            
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch((error) => {
          console.log(error);
          return done(null, false, { message: "Invalid Voter Name" });
        });
    }
  )
);


passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  let isVoter;
  if (user.firstName) {
    isVoter = false;
  } else if (user.voterId) {
    isVoter = true;
  }
  done(null, { _id: user.id, isVoter });
});

passport.deserializeUser((presentUser, done) => {
  console.log("deserializing user", presentUser._id);
  if (!presentUser.isVoter) {
    Admin.findByPk(presentUser._id)
      .then((user) => {
        user.isVoter = presentUser.isVoter;
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  } else {
    Voter.findByPk(presentUser._id)
      .then((user) => {
        user.isVoter = presentUser.isVoter;
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  }
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
    passport.authenticate("admin-local", {
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
    response.render("electionpage",{questionsCount,votersCount,election,csrfToken:request.csrfToken()})
})

app.get("/elections/:id/questions",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
    const questionsList = await Question.getAllQuestions(request.params.id)
    const election = await Election.findByPk(request.params.id)
    response.render("questions",{questionsList,election,csrfToken:request.csrfToken()})
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

app.get("/elections/:id/preview",connectEnsureLogin.ensureLoggedIn(),async (request,response)=>{
  const election = await Election.findByPk(request.params.id)
  const questions= await election.getQuestions()
  let allQ2=true;
  for (let i=0;i<questions.length;i++){
    questions[i].answers=await questions[i].getAnswers()
    if(questions[i].answers.length<2){
      allQ2 = false
    }
  }

  response.render("preview",{
    election,
    data:questions,
    allQ2,
    csrfToken:request.csrfToken()
  })

})

app.get("/elections/:id/start",connectEnsureLogin.ensureLoggedIn(),(request,response)=>{
  const startedElection=Election
})

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.put("/elections/:id/questions/:qid",async (request,response)=>{
  const updatedQuestion = await Question.update({
    questionName:request.body.questionName,
    questionDescription:request.body.questionDescription
  },{
    where:{
      id:request.params.qid
    }
  })
  response.json(updatedQuestion)
})

app.put("/elections/:id/questions/:qid/answers/:aid",async (request,response)=>{
  const updateAnswer = await Answer.update({
    answerName:request.body.answerName
  },{
    where:{
      id:request.params.aid
    }
  })
  response.json(updateAnswer)
})

app.delete("/elections/:id/questions/:qid/answers/:aid",async (request,response)=>{
  const deletedResponse = await Answer.destroy({where:{
    id:request.params.aid
  }})
  response.json(deletedResponse)
})
app.delete("/elections/:id/questions/:qid",async (request,response)=>{
  const deletedResponse = await Question.destroy({where:{
    id:request.params.qid
  }})
  response.json(deletedResponse)
})


app.put(
  "/elections/:id/start",
  async (request, response) => {
    try {
      const election = await Election.findByPk(request.params.id);
      
      
      const updatedElection = await election.update({runningStatus:true},{where:{
        id:request.params.id
      }});

      response.json(updatedElection);
    } catch (error) {
      console.log(error);
      response.status(420);
    }
  }
);
app.put(
  "/elections/:id/endelection",
  async (request, response) => {
    try {
      const election = await Election.findByPk(request.params.id);
      const updatedElection = await election.update({runningStatus:false},{where:{
        id:request.params.id
      }});

      response.json(updatedElection);
    } catch (error) {
      console.log(error);
      response.status(420);
    }
  }
);

app.get("/elections/:id/voting",ensureVoterLoggedIn(),canVote(),async (request,response)=>{
  const election = await Election.findByPk(request.params.id)
  const questions= await election.getQuestions()
  for (let i=0;i<questions.length;i++){
    const answers=await questions[i].getAnswers()
    if(answers.length>=2){
      questions[i].answers=answers
    }
  }

  response.render("voting",{
    election,
    data:questions,
    csrfToken:request.csrfToken()
  })
})

app.post("/elections/:id/castVote",ensureVoterLoggedIn(),canVote(),async (request,response)=>{
  delete request.body._csrf;
    console.log(request.body);
    for (const key in request.body) {
      await Answer.updateCount(request.body[key]);
    }
    await Voter.update({
      voteStatus:true
    },{
      where:{
        id:request.user.id
      }
    });
    response.redirect(`/elections/${request.params.id}/thankyou`);
  
})

app.get("/elections/:id/results",async (request,response)=>{
  const election = await Election.findByPk(request.params.id)
  const questions= await election.getQuestions()
  for (let i=0;i<questions.length;i++){
    const answers=await questions[i].getAnswers()
    if(answers.length>=2){
      questions[i].answers=answers
    }
  }

  response.render("results",{
    election,
    data:questions,
    csrfToken:request.csrfToken()
  })
})

app.get("/elections/:id/loginVoter",(request,response)=>{
  response.render("voterLogin", {
    title: "Voter Login",
    csrfToken: request.csrfToken(),
    id:request.params.id
  });
})

app.post(
"/elections/:id/loginVoter",
passport.authenticate("voter-local", {
failureRedirect: "back",
}),
(request, response) => {
console.log(request.user);
response.redirect(`/elections/${request.params.id}/voting`);
}
);

app.get("/elections/:id/thankyou",(request,response)=>{
  response.send("Your vote has been cast")
})

module.exports = app;
