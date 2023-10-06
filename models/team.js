module.exports = (sequelize, DataTypes) => {
    return sequelize.define('team', {
        playerid: DataTypes.STRING,
        beeid1: DataTypes.INTEGER,
        beeid2: DataTypes.INTEGER,
        beeid3: DataTypes.INTEGER,
        beeid4: DataTypes.INTEGER,
    }, {
        timestamps: false,
    });
};