module.exports = (sequelize, DataTypes) => {
    return sequelize.define('quests', {
        questid: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        questInfo: DataTypes.STRING,
        questLineNum: DataTypes.INTEGER,
    }, {
            timestamps: false,
        });
};