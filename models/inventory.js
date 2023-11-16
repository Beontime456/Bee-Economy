module.exports = (sequelize, DataTypes) => {
    return sequelize.define('inventory', {
        playerid: {
            type: DataTypes.BIGINT,
        },
        itemid: {
            type: DataTypes.INTEGER,
        },
        itemAmount: DataTypes.INTEGER,
    }, {
            timestamps: false,
        });
};