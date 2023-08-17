module.exports = (sequelize, DataTypes) => {
    return sequelize.define('playerbees', {
        playerid: DataTypes.STRING,
        beeid: DataTypes.INTEGER,
        beeLevel: DataTypes.INTEGER,
        beeTier: DataTypes.INTEGER,
        beeEvolved: DataTypes.STRING,
    }, {
            timestamps: false,
        });
};