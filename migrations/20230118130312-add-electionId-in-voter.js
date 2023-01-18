"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Voters", "electionId", {
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE "Voters" ADD CONSTRAINT "Voters_electionId_Elections_fk" FOREIGN KEY ("electionId") REFERENCES "Elections" (id) MATCH SIMPLE ON DELETE CASCADE'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Voters", "electionId");
  },
};