/// <reference path="libs/js/stream-deck.js" />

const API_BASE = 'https://api.gametools.network/bf6/stats/';

class BF6StatsPlugin {
  constructor() {
    this.contexts = new Map();
    this.statsCache = new Map();
    this.statModes = ['kd', 'kills', 'wins'];

    this.connectElgatoStreamDeckSocket = this.connectElgatoStreamDeckSocket.bind(this);
  }

  connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    this.pluginUUID = inPluginUUID;

    this.websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);

    this.websocket.onopen = () => {
      this.websocket.send(JSON.stringify({
        event: inRegisterEvent,
        uuid: inPluginUUID
      }));
    };

    this.websocket.onmessage = (evt) => {
      const message = JSON.parse(evt.data);
      this.handleMessage(message);
    };
  }

  handleMessage(message) {
    const { event, context, payload, action } = message;

    switch (event) {
      case 'willAppear':
        this.onWillAppear(context, payload);
        break;
      case 'willDisappear':
        this.onWillDisappear(context);
        break;
      case 'keyUp':
        this.onKeyUp(context, payload);
        break;
      case 'didReceiveSettings':
        this.onDidReceiveSettings(context, payload);
        break;
    }
  }

  onWillAppear(context, payload) {
    const settings = payload.settings || {};
    this.contexts.set(context, {
      settings,
      currentStatIndex: 0,
      refreshInterval: null
    });

    this.startRefreshInterval(context);
    this.fetchAndDisplayStats(context);
  }

  onWillDisappear(context) {
    const contextData = this.contexts.get(context);
    if (contextData?.refreshInterval) {
      clearInterval(contextData.refreshInterval);
    }
    this.contexts.delete(context);
  }

  onKeyUp(context, payload) {
    const contextData = this.contexts.get(context);
    if (!contextData) return;

    // Cycle to next stat on button press
    contextData.currentStatIndex = (contextData.currentStatIndex + 1) % this.statModes.length;
    this.displayCurrentStat(context);
  }

  onDidReceiveSettings(context, payload) {
    const contextData = this.contexts.get(context);
    if (contextData) {
      contextData.settings = payload.settings || {};
      this.fetchAndDisplayStats(context);
    }
  }

  startRefreshInterval(context) {
    const contextData = this.contexts.get(context);
    if (!contextData) return;

    // Clear existing interval
    if (contextData.refreshInterval) {
      clearInterval(contextData.refreshInterval);
    }

    // Refresh stats every 5 minutes
    contextData.refreshInterval = setInterval(() => {
      this.fetchAndDisplayStats(context);
    }, 5 * 60 * 1000);
  }

  async fetchAndDisplayStats(context) {
    const contextData = this.contexts.get(context);
    if (!contextData) return;

    const { settings } = contextData;
    const playerName = settings.playerName;
    const platform = settings.platform || 'pc';

    if (!playerName) {
      this.setTitle(context, 'Set\nPlayer');
      return;
    }

    try {
      const url = `${API_BASE}?name=${encodeURIComponent(playerName)}&platform=${platform}&format_values=true`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.errors || !data.userName) {
        this.setTitle(context, 'Player\nNot Found');
        return;
      }

      // Calculate totals from classes data
      let totalKills = 0;
      let totalDeaths = 0;
      let totalWins = 0;
      let totalLosses = 0;

      if (data.classes && Array.isArray(data.classes)) {
        data.classes.forEach(cls => {
          totalKills += cls.kills || 0;
          totalDeaths += cls.deaths || 0;
        });
      }

      if (data.gamemodes && Array.isArray(data.gamemodes)) {
        data.gamemodes.forEach(mode => {
          totalWins += mode.wins || 0;
          totalLosses += mode.losses || 0;
        });
      }

      const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : '0.00';
      const winRate = (totalWins + totalLosses) > 0
        ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)
        : '0.0';

      this.statsCache.set(context, {
        kills: totalKills,
        deaths: totalDeaths,
        kd,
        wins: totalWins,
        losses: totalLosses,
        winRate,
        playerName: data.userName
      });

      this.displayCurrentStat(context);

    } catch (error) {
      console.error('BF6 Stats fetch error:', error);
      this.setTitle(context, 'API\nError');
    }
  }

  displayCurrentStat(context) {
    const contextData = this.contexts.get(context);
    const stats = this.statsCache.get(context);

    if (!contextData || !stats) {
      return;
    }

    const mode = this.statModes[contextData.currentStatIndex];
    let title = '';

    switch (mode) {
      case 'kd':
        title = `K/D\n${stats.kd}`;
        break;
      case 'kills':
        title = `Kills\n${this.formatNumber(stats.kills)}`;
        break;
      case 'wins':
        title = `Wins\n${stats.winRate}%`;
        break;
    }

    this.setTitle(context, title);
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  setTitle(context, title) {
    this.websocket.send(JSON.stringify({
      event: 'setTitle',
      context,
      payload: {
        title,
        target: 0
      }
    }));
  }
}

const plugin = new BF6StatsPlugin();

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
  plugin.connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo);
}
