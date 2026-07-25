/*
 * Quest custom Q50002: Ecos del Pasado.
 * Quest repetible de caza, nivel 45+.
 *
 * Flujo:
 *  1. Kael (50000) pide eliminar 20 Espectros de las Eras (50002).
 *  2. Cada kill suma un Eco Temporal (item de quest, drop garantizado).
 *  3. Al juntar 20, Kael paga adena + cristales D. Se puede repetir.
 */
package quests.custom.Q50002_EcosDelPasado;

import org.l2jmobius.gameserver.model.actor.Npc;
import org.l2jmobius.gameserver.model.actor.Player;
import org.l2jmobius.gameserver.model.quest.Quest;
import org.l2jmobius.gameserver.model.quest.QuestState;
import org.l2jmobius.gameserver.model.quest.State;

public class Q50002_EcosDelPasado extends Quest
{
	private static final int KAEL = 50000;
	private static final int ESPECTRO = 50002;
	// Items
	private static final int ECO_TEMPORAL = 57001;
	private static final int ECOS_NECESARIOS = 20;
	private static final int ADENA = 57;
	private static final int CRISTAL_D = 1458;
	// Recompensas
	private static final int RECOMPENSA_ADENA = 120000;
	private static final int RECOMPENSA_CRISTALES = 40;
	private static final int NIVEL_MINIMO = 45;

	public Q50002_EcosDelPasado()
	{
		super(50002);
		addStartNpc(KAEL);
		addTalkId(KAEL);
		addKillId(ESPECTRO);
		registerQuestItems(ECO_TEMPORAL);
	}

	@Override
	public String onAdvEvent(String event, Npc npc, Player player)
	{
		final QuestState qs = getQuestState(player, false);
		if (qs == null)
		{
			return null;
		}

		switch (event)
		{
			case "aceptar.htm":
			{
				qs.startQuest();
				break;
			}
			case "completar.htm":
			{
				if ((qs.getCond() == 2) && (getQuestItemsCount(player, ECO_TEMPORAL) >= ECOS_NECESARIOS))
				{
					takeItems(player, ECO_TEMPORAL, -1);
					giveItems(player, ADENA, RECOMPENSA_ADENA);
					giveItems(player, CRISTAL_D, RECOMPENSA_CRISTALES);
					qs.exitQuest(true, true); // repetible
				}
				else
				{
					return "sin-ecos.htm";
				}
				break;
			}
		}
		return event;
	}

	@Override
	public String onTalk(Npc npc, Player player)
	{
		final QuestState qs = getQuestState(player, true);
		switch (qs.getState())
		{
			case State.CREATED:
			{
				return (player.getLevel() >= NIVEL_MINIMO) ? "inicio.htm" : "nivel-bajo.htm";
			}
			case State.STARTED:
			{
				return (qs.getCond() == 2) ? "ecos-listos.htm" : "en-progreso.htm";
			}
		}
		return getNoQuestMsg(player);
	}

	@Override
	public String onKill(Npc npc, Player killer, boolean isSummon)
	{
		final QuestState qs = getQuestState(killer, false);
		if ((qs != null) && qs.isCond(1))
		{
			giveItems(killer, ECO_TEMPORAL, 1);
			if (getQuestItemsCount(killer, ECO_TEMPORAL) >= ECOS_NECESARIOS)
			{
				qs.setCond(2, true);
			}
			else
			{
				playSound(killer, "ItemSound.quest_itemget");
			}
		}
		return super.onKill(npc, killer, isSummon);
	}
}
