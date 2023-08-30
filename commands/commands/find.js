const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'playerinfo.sqlite',
});

const playerinformation = sequelize.define('playerinformation', {
    playerid: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    money: DataTypes.INTEGER,
    beeSlots: DataTypes.INTEGER,
    energy: DataTypes.INTEGER,
    lastEnergyRegen: DataTypes.INTEGER,
    lastAdvClaim: DataTypes.INTEGER,
    area: DataTypes.STRING,
}, {
        timestamps: false,
    });
playerinformation.sync();

const playerbees = sequelize.define('playerbees', {
    playerid: DataTypes.STRING,
    IBI: DataTypes.INTEGER,
    beeid: DataTypes.INTEGER,
    beeLevel: DataTypes.INTEGER,
    beeTier: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
playerbees.sync();

const beelist = sequelize.define('beelist', {
    beeid: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    beeName: {
        type: DataTypes.STRING,
    },
    beeGrade: DataTypes.STRING,
    beeBaseTier: DataTypes.INTEGER,
    findType: DataTypes.STRING,
    beePrice: DataTypes.INTEGER,
}, {
        timestamps: false,
    });
beelist.sync();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('find')
		.setDescription('Find a bee in your current area.'),
	async execute(interaction) {
        function beeFact() {
            const beeFacts = ['Bumble bees are apart of the apidae bee family.', 'The average bumble bee life span is 4 weeks.', 'The majority of bumble bee species in Europe seemingly like the colours violet or blue.',
            'A honey bee can fly up to 15 miles per hour.', 'Bees are relatives of ants!', 'Male drone bees don\'t have a stinger.', 'Bees have 5 eyes.', 'Bees struggle distinguishing red colours compared to bluer tones.',
            'Worker bees communicate with dancing or shaking their bodies.', 'A bee flaps it\'s wings 200x per second.', 'Bees can experience PTSD-like symptoms.', 'Bees recognize different human faces.',
            'Bees like humans who take care of them!', 'Bees are usually optimistic when successfully foraging, but can become depressed if momentarily trapped by a predatory spider.',
            'The Megachilidae Bee family has the most diverse nesting habits. They construct hives using mud, gravel, resin, plant fiber, wood pulp, and leaf pulp.', 'The Megachilidae bee family builds their nests in cavities, mainly in rotting wood, using leaves.',
            'The Andrenidae bee family is collectively known as mining bees. It consists of solitary bees that nest on the ground!', 'Halictidae bees are all ground-nesting bees with extremely diverse levels of sociality. Some species can even switch between being social or solitary depending on their environment.',
            'The Halictidae family also known as \'Sweet\' bees, because of their small size (4-8mm) these insects comprise some groups which are metallic in appearance.', 'The Stenotritidae bee family is the smallest of the seven bee families with 2 subfamilies and 21 species. The family is only found in Australia and closely related to Colletidae.'];
            const randomFact = Math.floor(Math.random() * 20);
            return beeFacts[randomFact];
        }
        function capitaliseWords(sentence) {
            return sentence.replace(/\b\w/g, char => char.toUpperCase());
        }
        try {
            const findplayerBeeSlots = await playerinformation.findOne({ where: { playerid: interaction.user.id } });
            if (findplayerBeeSlots.get('energy') - 20 >= 0) {
                if (findplayerBeeSlots.get('beeSlots') >= await playerbees.count({ where: { playerid: interaction.user.id } }) + 1) {
                    const gradeNumber = Math.floor(Math.random() * 101);
                    if (gradeNumber <= 15) {
                        const findableBees = await beelist.findAll({ where: { findType: findplayerBeeSlots.get('area'), beeGrade: 'F' } });
                        const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                        const findembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${interaction.user.username}'s exploration results (-20 energy)`, iconURL: interaction.user.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
                        interaction.reply({ embeds: [findembed] });
                        const findplayerBeeSlotsbees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                        let nextIBI = 0;
                        if (findplayerBeeSlotsbees.length > 0) {
                            let currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerBeeSlotsbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: interaction.user.id,
                            IBI: nextIBI,
                            beeid: beeFound.get('beeid'),
                            beeLevel: 1,
                            beeTier: beeFound.get('beeBaseTier'),
                        });
                    }
                    else if (gradeNumber > 15 && gradeNumber <= 45) {
                        const findableBees = await beelist.findAll({ where: { findType: findplayerBeeSlots.get('area'), beeGrade: 'E' } });
                        const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                        const findembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${interaction.user.username}'s exploration results (-20 energy)`, iconURL: interaction.user.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
                        interaction.reply({ embeds: [findembed] });
                        const findplayerBeeSlotsbees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                        let nextIBI = 0;
                        if (findplayerBeeSlotsbees.length > 0) {
                            let currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerBeeSlotsbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: interaction.user.id,
                            IBI: nextIBI,
                            beeid: beeFound.get('beeid'),
                            beeLevel: 1,
                            beeTier: beeFound.get('beeBaseTier'),
                        });
                    }
                    else if (gradeNumber > 45 && gradeNumber <= 70) {
                        const findableBees = await beelist.findAll({ where: { findType: findplayerBeeSlots.get('area'), beeGrade: 'D' } });
                        const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                        const findembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${interaction.user.username}'s exploration results (-20 energy)`, iconURL: interaction.user.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
                        interaction.reply({ embeds: [findembed] });
                        const findplayerBeeSlotsbees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                        let nextIBI = 0;
                        if (findplayerBeeSlotsbees.length > 0) {
                            let currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerBeeSlotsbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: interaction.user.id,
                            IBI: nextIBI,
                            beeid: beeFound.get('beeid'),
                            beeLevel: 1,
                            beeTier: beeFound.get('beeBaseTier'),
                        });
                    }
                    else if (gradeNumber > 70 && gradeNumber <= 85) {
                        const findableBees = await beelist.findAll({ where: { findType: findplayerBeeSlots.get('area'), beeGrade: 'C' } });
                        const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                        const findembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${interaction.user.username}'s exploration results (-20 energy)`, iconURL: interaction.user.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
                        interaction.reply({ embeds: [findembed] });
                        const findplayerBeeSlotsbees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                        let nextIBI = 0;
                        if (findplayerBeeSlotsbees.length > 0) {
                            let currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerBeeSlotsbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: interaction.user.id,
                            IBI: nextIBI,
                            beeid: beeFound.get('beeid'),
                            beeLevel: 1,
                            beeTier: beeFound.get('beeBaseTier'),
                        });
                    }
                    else if (gradeNumber > 85 && gradeNumber <= 95) {
                        const findableBees = await beelist.findAll({ where: { findType: findplayerBeeSlots.get('area'), beeGrade: 'B' } });
                        const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                        const findembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${interaction.user.username}'s exploration results (-20 energy)`, iconURL: interaction.user.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
                        interaction.reply({ embeds: [findembed] });
                        const findplayerBeeSlotsbees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                        let nextIBI = 0;
                        if (findplayerBeeSlotsbees.length > 0) {
                            let currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerBeeSlotsbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: interaction.user.id,
                            IBI: nextIBI,
                            beeid: beeFound.get('beeid'),
                            beeLevel: 1,
                            beeTier: beeFound.get('beeBaseTier'),
                        });
                    }
                    else if (gradeNumber > 95 && gradeNumber <= 99) {
                        const findableBees = await beelist.findAll({ where: { findType: findplayerBeeSlots.get('area'), beeGrade: 'A' } });
                        const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                        const findembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${interaction.user.username}'s exploration results (-20 energy)`, iconURL: interaction.user.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
                        interaction.reply({ embeds: [findembed] });
                        const findplayerBeeSlotsbees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                        let nextIBI = 0;
                        if (findplayerBeeSlotsbees.length > 0) {
                            let currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerBeeSlotsbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: interaction.user.id,
                            IBI: nextIBI,
                            beeid: beeFound.get('beeid'),
                            beeLevel: 1,
                            beeTier: beeFound.get('beeBaseTier'),
                        });
                    }
                    else if (gradeNumber === 100) {
                        const findableBees = await beelist.findAll({ where: { findType: findplayerBeeSlots.get('area'), beeGrade: 'S' } });
                        const beeFound = findableBees[Math.floor(Math.random() * findableBees.length)];
                        const findembed = new EmbedBuilder()
                            .setColor(0xffe521)
                            .setAuthor({ name: `${interaction.user.username}'s exploration results (-20 energy)`, iconURL: interaction.user.displayAvatarURL() })
                            .setFooter({ text: beeFact() })
                            .addFields({ name: `${capitaliseWords(beeFound.get('beeName'))}`, value: `Grade: ${beeFound.get('beeGrade')}` });
                        interaction.reply({ embeds: [findembed] });
                        const findplayerBeeSlotsbees = await playerbees.findAll({ where: { playerid: interaction.user.id }, order: sequelize.literal('IBI ASC') });
                        let nextIBI = 0;
                        if (findplayerBeeSlotsbees.length > 0) {
                            let currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                            while (nextIBI === currentIBI) {
                                nextIBI++;
                                if (findplayerBeeSlotsbees[nextIBI] != undefined) {
                                    currentIBI = await findplayerBeeSlotsbees[nextIBI].dataValues.IBI;
                                }
                            }
                        }
                        await playerbees.create({
                            playerid: interaction.user.id,
                            IBI: nextIBI,
                            beeid: beeFound.get('beeid'),
                            beeLevel: 1,
                            beeTier: beeFound.get('beeBaseTier'),
                        });
                    }
                    await findplayerBeeSlots.update({ energy: findplayerBeeSlots.get('energy') - 20 });
                }
                else {
                    interaction.reply('You don\'t have enough bee slots for another bee! Get some more lmao');
                }
            }
            else {
                interaction.reply('You don\'t have enough energy to look for another bee! Try resting for a while then try again.');
            }
        }
        catch (error) {
            if (error.name === 'TypeError') {
                interaction.reply('You haven\'t started yet! Use `bee start` to start.');
            }
            else {
                interaction.reply(`There was an error! ${error.name}: ${error.message}`);
                console.log(error);
            }
        }
    },
};