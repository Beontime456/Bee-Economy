module.exports = (sequelize, DataTypes) => {
    return sequelize.define('area', {
        areaid: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        areaName: DataTypes.STRING,
    }, {
            timestamps: false,
        });
};