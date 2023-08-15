module.exports = (sequelize, DataTypes) => {
    return sequelize.define('inventory', {
        playerid: {
            type: DataTypes.INTEGER,
        },
        itemid: {
            type: DataTypes.INTEGER,
        },
        itemAmount: DataTypes.INTEGER,
    }, {
            timestamps: false,
        });
};