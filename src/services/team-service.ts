import { assertHasCookie, updateWorkspaceContext } from "../auth.js";
import { AccountClient } from "../api/account-client.js";
import { loadResolvedConfig } from "../config/loader.js";
import { normalizeTeamList, resolveTeamSelection } from "../domain/teams.js";
import { type LanhuConfigOverrides } from "../types.js";

export class TeamService {
  async list(overrides: LanhuConfigOverrides = {}) {
    const config = await loadResolvedConfig(overrides);
    assertHasCookie(config);

    const client = new AccountClient(config);
    const payload = await client.listUserTeams();
    const items = normalizeTeamList(payload, config.context.tenantId);

    return {
      config,
      items
    };
  }

  async switch(selection: string, overrides: LanhuConfigOverrides = {}) {
    const { items } = await this.list(overrides);
    const selected = resolveTeamSelection(items, selection);
    const config = await updateWorkspaceContext({
      tenantId: selected.tenantId,
      projectId: undefined
    });

    return {
      config,
      items,
      selected
    };
  }
}
