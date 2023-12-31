module.exports = (sequelize, DataTypes) => {
    return sequelize.define('skills', {
        skillid: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        skillName: DataTypes.STRING,
        skillRarity: DataTypes.STRING,
        skillType: DataTypes.STRING,
        skillCd: DataTypes.INTEGER,
        skillTarget: DataTypes.STRING,
        skillTargetType: DataTypes.STRING,
        skillDetails: DataTypes.JSON,
    }, {
        timestamps: false,
    });
};