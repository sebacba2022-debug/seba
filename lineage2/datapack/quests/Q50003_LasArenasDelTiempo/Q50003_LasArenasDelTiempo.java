/*
 * Quest custom Q50003: Las Arenas del Tiempo.
 * Quest de recoleccion, nivel 50+, una sola vez.
 *
 * Flujo:
 *  1. Doran, Herrero de las Eras (50001), pide 30 Arenas del Tiempo.
 *  2. Las Arenas caen de los Espectros (50002) con 60% de probabilidad.
 *  3. Al entregarlas, Doran forja y entrega un arma de mago encantada
 *     (Homunkulus's Sword +8, dropea tambien pergaminos de enchant).
 */
package quests.custom.Q50003_LasArenasDelTiempo;

import org.l2jmobius.commons.util.Rnd;
import org.l2jmobius.gameserver.model.actor.Npc;
import org.l2jmobius.gameserver.model.actor.Player;
import org.l2jmobius.gameserver.model.quest.Quest;
import org.l2jmobius.gameserver.model.quest.QuestState;
import org.l2jmobius.gameserver.model.quest.State;

public class Q50003_LasArenasDelTiempo extends Quest
{
	private static final int DORAN = 50001;
	private static final int ESPECTRO = 50002;
	// Items
	private static final int ARENA_DEL_TIEMPO = 57002;
	private static final int ARENAS_NECESARIAS = 30;
	private static final int PROBABILIDAD_DROP = 60; // %
	// Recompensas
	private static final int ESPADA_HOMUNKULUS = 84; // arma de mago grado C
	private static final int SCROLL_ENCHANT_ARMA_C = 951;
	private static final int RECOMPENSA_SCROLLS = 3;
	private static final int NIVEL_MINIMO = 50;

	public Q50003_LasArenasDelTiempo()
	{
		super(50003);
		addStartNpc(DORAN);
		addTalkId(DORAN);
		addKillId(ESPECTRO);
		registerQuestItems(ARENA_DEL_TIEMPO);
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
			case "forjar.htm":
			{
				if ((qs.getCond() == 2) && (getQuestItemsCount(player, ARENA_DEL_TIEMPO) >= ARENAS_NECESARIAS))
				{
					takeItems(player, ARENA_DEL_TIEMPO, -1);
					giveItems(player, ESPADA_HOMUNKULUS, 1);
					giveItems(player, SCROLL_ENCHANT_ARMA_C, RECOMPENSA_SCROLLS);
					qs.exitQuest(false, true);
				}
				else
				{
					return "sin-arenas.htm";
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
				return (qs.getCond() == 2) ? "arenas-listas.htm" : "en-progreso.htm";
			}
			case State.COMPLETED:
			{
				return getAlreadyCompletedMsg(player);
			}
		}
		return getNoQuestMsg(player);
	}

	@Override
	public String onKill(Npc npc, Player killer, boolean isSummon)
	{
		final QuestState qs = getQuestState(killer, false);
		if ((qs != null) && qs.isCond(1) && (Rnd.get(100) < PROBABILIDAD_DROP))
		{
			giveItems(killer, ARENA_DEL_TIEMPO, 1);
			if (getQuestItemsCount(killer, ARENA_DEL_TIEMPO) >= ARENAS_NECESARIAS)
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
