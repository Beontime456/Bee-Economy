module.exports = (sequelize, DataTypes) => {
    return sequelize.define('recipes', {
        itemName: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        itemReqs: DataTypes.JSON,
    }, {
            timestamps: false,
        });
};