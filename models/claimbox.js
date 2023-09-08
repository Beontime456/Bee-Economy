module.exports = (sequelize, DataTypes) => {
    return sequelize.define('giftbox', {
        playerid: DataTypes.STRING,
        giftid: DataTypes.INTEGER,
        beeid: DataTypes.INTEGER,
        beeTier: DataTypes.INTEGER,
        beePower: DataTypes.INTEGER,
    }, {
            timestamps: false,
        });
};