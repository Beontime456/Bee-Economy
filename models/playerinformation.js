module.exports = (sequelize, DataTypes) => {
    return sequelize.define('playerinformation', {
        playerid: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        money: DataTypes.INTEGER,
        beeSlots: DataTypes.INTEGER,
        energy: DataTypes.INTEGER,
        lastEnergyRegen: DataTypes.INTEGER,
        area: DataTypes.STRING,
    }, {
            timestamps: false,
        });
};