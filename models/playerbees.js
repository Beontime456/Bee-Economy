module.exports = (sequelize, DataTypes) => {
    return sequelize.define('playerbees', {
        playerid: DataTypes.STRING,
        IBI: DataTypes.INTEGER,
        beeid: DataTypes.INTEGER,
        beeLevel: DataTypes.INTEGER,
        beeTier: DataTypes.INTEGER,
    }, {
            timestamps: false,
        });
};