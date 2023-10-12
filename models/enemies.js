module.exports = (sequelize, DataTypes) => {
    return sequelize.define('enemies', {
        enemyid: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        enemyName: DataTypes.STRING,
    }, {
        timestamps: false,
    });
};