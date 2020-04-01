'use strict';
module.exports = (sequelize, DataTypes) => {
  const subscribe_node = sequelize.define('subscribe_node', {
    topic: DataTypes.TEXT,
    active: DataTypes.BOOLEAN
  }, {});
  subscribe_node.associate = function(models) {
    // associations can be defined here
  };
  return subscribe_node;
};