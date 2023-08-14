module.exports = (sequelize, DataTypes) => {
    return sequelize.define('beelist', {
        beeid: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        beeName: {
            type: DataTypes.STRING,
        },
        beeBaseRarity: DataTypes.STRING,
        findType: DataTypes.STRING,
        beePrice: DataTypes.INTEGER,
    }, {
            timestamps: false,
        });
};