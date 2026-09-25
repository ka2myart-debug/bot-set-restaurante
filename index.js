if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_motivo_reprovar_')) {
      await interaction.deferReply({ ephemeral: true });

      const msgId = interaction.customId.replace('modal_motivo_reprovar_', '');
      const motivo = interaction.fields.getTextInputValue('motivo_reprovacao');

      try {
        const idCanalAutorizar = '1551696595223838770';
        const canalAutorizar = await interaction.guild.channels.fetch(idCanalAutorizar).catch(() => null);

        if (canalAutorizar) {
          const mensagemOriginal = await canalAutorizar.messages.fetch(msgId).catch(() => null);
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
        }
      } catch (e) {
        console.error('Erro ao editar mensagem reprovada:', e);
      }

      await interaction.editReply({ content: `❌ Solicitação reprovada com sucesso. Motivo: ${motivo}` });
    }
