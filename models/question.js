'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Question.hasMany(models.Answer, {
        foreignKey: "questionId",
        onDelete: "CASCADE",
      });
    }
    static async getAllQuestions(electionId){
      return Question.findAll({
        where:{
          electionId
        }
      })
    }

    static async addQuestion({questionName,questionDescription,electionId}){
      return Question.create({
        questionName,
        questionDescription,
        electionId
      })
    }
  }
  Question.init({
    questionName: DataTypes.STRING,
    questionDescription: DataTypes.TEXT,
    electionId:DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Question',
  });
  return Question;
};