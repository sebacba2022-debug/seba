/*
 * Quest custom Q50001: El Relicario de las Eras.
 * Quest de cambio de clase a Cronomante (classId 190), nivel 40+.
 *
 * Flujo:
 *  1. Hablar con Kael (50000): acepta la mision.
 *  2. Cazar Espectros de las Eras (50002) hasta juntar 3 Fragmentos del Relicario.
 *  3. Volver con Kael: entrega los fragmentos, cambia de clase y recibe recompensa.
 *
 * Instalacion: dist/game/data/scripts/quests/custom/Q50001_ElRelicarioDeLasEras/
 * (ver docs/02-instalacion-mod.md)
 */
package quests.custom.Q50001_ElRelicarioDeLasEras;

import org.l2jmobius.gameserver.model.actor.Npc;
import org.l2jmobius.gameserver.model.actor.Player;
import org.l2jmobius.gameserver.model.quest.Quest;
import org.l2jmobius.gameserver.model.quest.QuestState;
import org.l2jmobius.gameserver.model.quest.State;

public class Q50001_ElRelicarioDeLasEras extends Quest
{
	// NPCs
	private static final int KAEL = 50000;
	private static final int ESPECTRO = 50002;
	// Items
	private static final int FRAGMENTO_RELICARIO = 57000; // item custom de quest
	private static final int FRAGMENTOS_NECESARIOS = 3;
	// Recompensa y clase
	private static final int CLASS_ID_CRONOMANTE = 190;
	private static final int ADENA = 57;
	private static final int RECOMPENSA_ADENA = 500000;
	// Condiciones
	private static final int NIVEL_MINIMO = 40;

	public Q50001_ElRelicarioDeLasEras()
	{
		super(50001);
		addStartNpc(KAEL);
		addTalkId(KAEL);
		addKillId(ESPECTRO);
		registerQuestItems(FRAGMENTO_RELICARIO);
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
				qs.startQuest(); // cond = 1
				break;
			}
			case "completar.htm":
			{
				if ((qs.getCond() == 2) && (getQuestItemsCount(player, FRAGMENTO_RELICARIO) >= FRAGMENTOS_NECESARIOS))
				{
					takeItems(player, FRAGMENTO_RELICARIO, -1);
					giveItems(player, ADENA, RECOMPENSA_ADENA);
					player.setClassId(CLASS_ID_CRONOMANTE);
					player.setBaseClass(CLASS_ID_CRONOMANTE);
					player.broadcastUserInfo();
					qs.exitQuest(false, true);
				}
				else
				{
					return "sin-fragmentos.htm";
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
				return (qs.getCond() == 2) ? "fragmentos-listos.htm" : "en-progreso.htm";
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
		if ((qs != null) && qs.isCond(1))
		{
			giveItems(killer, FRAGMENTO_RELICARIO, 1);
			if (getQuestItemsCount(killer, FRAGMENTO_RELICARIO) >= FRAGMENTOS_NECESARIOS)
			{
				qs.setCond(2, true); // suena el "ding" de quest actualizada
			}
			else
			{
				playSound(killer, "ItemSound.quest_itemget");
			}
		}
		return super.onKill(npc, killer, isSummon);
	}
}
