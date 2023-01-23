'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Voter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
    static async getAllVoters(electionId){
      return Voter.findAll({
        where:{
          electionId
        }
      })
    }
    static async addVoter({voterId,password,electionId}){
      return await Voter.create({
        
          voterId,
          password,
          electionId
        
      })
    }
  }
  Voter.init({
    voterId: DataTypes.STRING,
    password: DataTypes.STRING,
    electionId:DataTypes.INTEGER,
    voteStatus:DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Voter',
  });
  return Voter;
};