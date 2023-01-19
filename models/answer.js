'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Answer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static async getAnswers(questionId){
      return await Answer.findAll({
        where:{
          questionId
        }
      })
    }
    static async addAnswer({answerName,questionId}){
      return await Answer.create({
        answerName,
        questionId
      })
    }
  }
  Answer.init({
    answerName: DataTypes.STRING,
    voteCount: DataTypes.INTEGER,
    questionId:DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Answer',
  });
  return Answer;
};