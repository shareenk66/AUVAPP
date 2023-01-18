"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Questions", "electionId", {
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE "Questions" ADD CONSTRAINT "Questions_electionId_Elections_fk" FOREIGN KEY ("electionId") REFERENCES "Elections" (id) MATCH SIMPLE ON DELETE CASCADE'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Questions", "electionId");
  },
};