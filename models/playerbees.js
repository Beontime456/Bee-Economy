module.exports = (sequelize, DataTypes) => {
    return sequelize.define('playerbees', {
        playerid: DataTypes.STRING,
        beeid: DataTypes.INTEGER,
        beeRarity: DataTypes.STRING,
    }, {
            timestamps: false,
        });
};