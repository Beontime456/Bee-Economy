module.exports = (sequelize, DataTypes) => {
    return sequelize.define('items', {
        itemid: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        itemName: DataTypes.STRING,
        sellPrice: DataTypes.INTEGER,
        findType: DataTypes.STRING,
    }, {
            timestamps: false,
        });
};