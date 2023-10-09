module.exports = (sequelize, DataTypes) => {
    return sequelize.define('skills', {
        skillid: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        skillName: DataTypes.STRING,
        skillType: DataTypes.ENUM('passive', 'active'),
        skillDetails: DataTypes.JSON,
    }, {
        timestamps: false,
    });
};