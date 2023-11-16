module.exports = (sequelize, DataTypes) => {
    return sequelize.define('playerinformation', {
        playerid: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        money: DataTypes.INTEGER,
        beeSlots: DataTypes.INTEGER,
        energy: DataTypes.INTEGER,
        lastEnergyRegen: DataTypes. BIGINT,
        lastAdvClaim: DataTypes.BIGINT,
        area: DataTypes.STRING,
        currentQuest: DataTypes.INTEGER,
        beeTeam: DataTypes.TEXT,
        dojoStatus: DataTypes.TEXT,
    }, {
            timestamps: false,
        });
};