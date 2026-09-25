const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot está online!');
}).listen(process.env.PORT || 3000);

require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

client.once('ready', () => {
  console.log('🤖 Bot de Sets Limpo e Online!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!painelset') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Apenas administradores podem gerar o painel de sets.');
    }

    const embed = new EmbedBuilder()
      .setTitle('✏️ Solicitação de Set - Tabacudos Restaurante')
      .setDescription('Clique no botão abaixo para preencher o seu **Nome no Game** e o seu **ID**. A sua solicitação será enviada para a equipa analisar e autorizar!')
      .setColor('#ff9900');

    const btnSolicitar = new ButtonBuilder()
      .setCustomId('solicitar_set')
      .setLabel('Solicitar Set')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(btnSolicitar);

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => {});
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId === 'solicitar_set') {
      const modal = new ModalBuilder()
        .setCustomId('modal_solicitar_set')
        .setTitle('Solicitação de Set - Tabacudos');

      const inputNome = new TextInputBuilder()
        .setCustomId('nome_game')
        .setLabel('Qual o seu Nome no Game?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputId = new TextInputBuilder()
        .setCustomId('id_game')
        .setLabel('Qual o seu ID no Game?')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(inputNome),
        new ActionRowBuilder().addComponents(inputId)
      );

      return await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_solicitar_set') {
      await interaction.deferReply({ ephemeral: true });

      const nomeGame = interaction.fields.getTextInputValue('nome_game');
      const idGame = interaction.fields.getTextInputValue('id_game');
      const novoApelido = `${nomeGame} | ${idGame}`;

      try {
        const membro = await interaction.guild.members.fetch(interaction.user.id);
        await membro.setNickname(novoApelido);
      } catch (error) {
        console.log('Não foi possível alterar o apelido:', error);
      }

      await interaction.editReply({ 
        content: `✅ A sua solicitação foi enviada para aprovação da gerência e o seu apelido foi atualizado!` 
      });

      const idCanalAutorizar = '1551696595223838770'; 
      const canalAutorizar = await interaction.guild.channels.fetch(idCanalAutorizar).catch(() => null);

      if (canalAutorizar) {
        const embedLog = new EmbedBuilder()
          .setTitle('📥 Nova Solicitação de Set para Análise')
          .addFields(
            { name: 'Utilizador do Discord', value: `<@${interaction.user.id}>`, inline: false },
            { name: 'Nome no Game', value: nomeGame, inline: true },
            { name: 'ID no Game', value: idGame, inline: true },
            { name: 'Apelido Aplicado', value: novoApelido, inline: false }
          )
          .setColor('#ff9900')
          .setTimestamp();

        const btnAprovar = new ButtonBuilder()
          .setCustomId('aprovar_set')
          .setLabel('Aprovar')
          .setStyle(ButtonStyle.Success);

        const btnReprovar = new ButtonBuilder()
          .setCustomId('reprovar_set')
          .setLabel('Reprovar')
          .setStyle(ButtonStyle.Danger);

        const rowBotoes = new ActionRowBuilder().addComponents(btnAprovar, btnReprovar);

        await canalAutorizar.send({ embeds: [embedLog], components: [rowBotoes] }).catch(() => {});
      }
    }

    if (interaction.isButton() && interaction.customId === 'aprovar_set') {
      await interaction.deferUpdate();

      const embedOriginal = interaction.message.embeds[0];
      const embedAprovado = new EmbedBuilder(embedOriginal)
        .setTitle('✅ Solicitação de Set - APROVADA')
        .setColor('#00ff00')
        .addFields(
          { name: 'Status', value: `Aprovado por <@${interaction.user.id}>`, inline: false },
          { name: 'Aviso', value: '⚠️ **Lembrete:** O apelido já foi alterado. Por favor, atribua apenas o cargo manualmente ao usuário no servidor!', inline: false }
        );

      await interaction.message.edit({ embeds: [embedAprovado], components: [] });
    }

    if (interaction.isButton() && interaction.customId === 'reprovar_set') {
      // Usamos os campos customizados do modal com o ID da mensagem embutido para evitar perda de dados no Map
      const modalMotivo = new ModalBuilder()
        .setCustomId(`modal_motivo_reprovar_${interaction.message.id}`)
        .setTitle('Motivo da Reprovação');

      const inputMotivo = new TextInputBuilder()
        .setCustomId('motivo_reprovacao')
        .setLabel('Qual o motivo da reprovação?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modalMotivo.addComponents(new ActionRowBuilder().addComponents(inputMotivo));
      return await interaction.showModal(modalMotivo);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_motivo_reprovar_')) {
      await interaction.deferReply({ ephemeral: true });

      const msgId = interaction.customId.replace('modal_motivo_reprovar_', '');
      const motivo = interaction.fields.getTextInputValue('motivo_reprovacao');

      try {
        const mensagemOriginal = await interaction.channel.messages.fetch(msgId);
        if (mensagemOriginal) {
          const embedOriginal = mensagemOriginal.embeds[0];
          const embedReprovado = new EmbedBuilder(embedOriginal)
            .setTitle('❌ Solicitação de Set - REPROVADA')
            .setColor('#ff0000')
            .addFields(
              { name: 'Status', value: `Reprovado por <@${interaction.user.id}>`, inline: false },
              { name: 'Motivo', value: motivo, inline: false }
            );

          await mensagemOriginal.edit({ embeds: [embedReprovado], components: [] });
        }
      } catch (e) {
        console.error('Erro ao editar mensagem reprovada:', e);
      }

      await interaction.editReply({ content: `❌ Solicitação reprovada com sucesso. Motivo: ${motivo}` });
    }
  } catch (erro) {
    console.error('Erro na interação do bot de set:', erro);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocorreu um erro ao processar esta ação.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
