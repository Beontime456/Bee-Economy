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
        beeBaseTier: DataTypes.INTEGER,
        findType: DataTypes.STRING,
        beePrice: DataTypes.INTEGER,
    }, {
            timestamps: false,
        });
};