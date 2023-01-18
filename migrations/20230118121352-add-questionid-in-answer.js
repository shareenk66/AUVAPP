"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Answers", "questionId", {
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE "Answers" ADD CONSTRAINT "Answers_questionId_Questions_fk" FOREIGN KEY ("questionId") REFERENCES "Questions" (id) MATCH SIMPLE ON DELETE CASCADE'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Answers", "questionId");
  },
};