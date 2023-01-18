'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static async getAllElections(adminId){
      return await Election.findAll({
        where:{
          adminId
        }
      })
    }
    static async addElection({adminId,electionName}){
      return Election.create({
        adminId,
        electionName,
        runningStatus:false,
      })
    }
  }
  Election.init({
    electionName: DataTypes.STRING,
    runningStatus: DataTypes.BOOLEAN,
    adminId:DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Election',
  });
  return Election;
};