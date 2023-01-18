"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Elections", "adminId", {
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE "Elections" ADD CONSTRAINT "Elections_adminId_Admins_fk" FOREIGN KEY ("adminId") REFERENCES "Admins" (id) MATCH SIMPLE ON DELETE CASCADE'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Elections", "adminId");
  },
};