module.exports = (sequelize, DataTypes) => {
    return sequelize.define('recipes', {
        itemName: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        itemReqs: DataTypes.JSONB,
    }, {
            timestamps: false,
        });
};