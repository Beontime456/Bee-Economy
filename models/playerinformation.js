module.exports = (sequelize, DataTypes) => {
    return sequelize.define('playerinformation', {
        playerid: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        money: DataTypes.INTEGER,
        beeSlots: DataTypes.INTEGER,
    }, {
            timestamps: false,
        });
};