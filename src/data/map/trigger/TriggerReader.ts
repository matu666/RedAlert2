import { TriggerEventType } from './TriggerEventType';
import { TriggerActionType } from './TriggerActionType';

export class TriggerReader {
  read(triggers: Map<string, string>, events: Map<string, string>, actions: Map<string, string>, tags: Map<string, any>) {
    const triggerList = this.readTriggers(triggers);
    const { events: eventMap, unknownEventTypes } = this.readEvents(events);
    const { actions: actionMap, unknownActionTypes } = this.readActions(actions);
    const tagList = [...tags.values()];
    const rootTriggers = new Set(triggerList);

    for (const trigger of triggerList.values()) {
      const triggerEvents = eventMap.get(trigger.id);
      if (triggerEvents) {
        trigger.events.push(...triggerEvents);
      }

      const triggerActions = actionMap.get(trigger.id);
      if (triggerActions) {
        trigger.actions.push(...triggerActions);
      }

      if (trigger.attachedTriggerId) {
        const attachedTrigger = triggerList.find(t => t.id === trigger.attachedTriggerId);
        if (attachedTrigger) {
          trigger.attachedTrigger = attachedTrigger;
          rootTriggers.delete(attachedTrigger);
        }
      }
    }

    for (const rootTrigger of rootTriggers) {
      const tag = tagList.find(t => t.triggerId === rootTrigger.id);
      if (tag) {
        let currentTrigger = rootTrigger;
        while (currentTrigger) {
          currentTrigger.tag = tag;
          currentTrigger = currentTrigger.attachedTrigger;
        }
      } else {
        let currentTrigger = rootTrigger;
        while (currentTrigger) {
          console.warn(
            `Trigger ${currentTrigger.id} has no associated tag or valid root trigger. Skipping.`
          );
          const index = triggerList.indexOf(currentTrigger);
          if (index !== -1) {
            triggerList.splice(index, 1);
          }
          currentTrigger = currentTrigger.attachedTrigger;
        }
      }
    }

    return {
      triggers: triggerList,
      unknownEventTypes,
      unknownActionTypes,
    };
  }

  private readTriggers(triggers: Map<string, string>) {
    const result: any[] = [];
    for (const [id, data] of triggers.entries()) {
      const parts = data.split(',');
      if (parts.length < 8) {
        console.warn(`Invalid trigger ${id}=${data}. Skipping.`);
      } else {
        const trigger = {
          id,
          houseName: parts[0],
          attachedTriggerId: parts[1] !== '<none>' ? parts[1] : undefined,
          attachedTrigger: undefined,
          name: parts[2],
          disabled: Boolean(Number(parts[3])),
          difficulties: {
            easy: Boolean(Number(parts[4])),
            medium: Boolean(Number(parts[5])),
            hard: Boolean(Number(parts[6])),
          },
          events: [],
          actions: [],
          tag: undefined,
        };
        result.push(trigger);
      }
    }
    return result;
  }

  private readEvents(events: Map<string, string>) {
    const eventMap = new Map();
    const unknownTypes = new Set();

    for (const [triggerId, data] of events.entries()) {
      const parts = data.split(',');
      if (parts.length < 4) {
        console.warn(`Invalid event ${triggerId}=${data}. Skipping.`);
      } else {
        const eventCount = Number(parts.shift());
        const eventList = [];

        for (let i = 0; i < eventCount; i++) {
          const type = Number(parts.shift());
          const paramCount = Number(parts.shift());
          const params = parts.splice(0, paramCount === 2 ? 2 : 1);

          if (TriggerEventType[type] !== undefined) {
            const event = {
              triggerId,
              eventIndex: i,
              type,
              params: [paramCount, ...params.map(p => p || '0')],
            };
            eventList.push(event);
          } else {
            unknownTypes.add(type);
            console.warn(
              `Unknown event type ${type} for trigger id ${triggerId}. Skipping.`
            );
          }
        }
        eventMap.set(triggerId, eventList);
      }
    }

    return { events: eventMap, unknownEventTypes: unknownTypes };
  }

  private readActions(actions: Map<string, string>) {
    const actionMap = new Map();
    const unknownTypes = new Set();

    for (const [triggerId, data] of actions.entries()) {
      const parts = data.split(',');
      if (parts.length < 9) {
        console.warn(`Invalid action ${triggerId}=${data}. Skipping.`);
      } else {
        const actionCount = Number(parts.shift());
        if (parts.length < 8 * actionCount) {
          console.warn(`Invalid action ${triggerId}=${data}. Skipping.`);
        } else {
          const actionList = [];

          for (let i = 0; i < actionCount; i++) {
            const type = Number(parts.shift());
            const params = parts.splice(0, 7);

            if (TriggerActionType[type] !== undefined) {
              const action = {
                triggerId,
                index: i,
                type,
                params: [
                  Number(params[0] || '0'),
                  params[1] || '0',
                  params[2] || '0',
                  params[3] || '0',
                  params[4] || '0',
                  params[5] || '0',
                  params[6] ? this.readAZActionParam(params[6]) : 0,
                ],
              };
              actionList.push(action);
            } else {
              unknownTypes.add(type);
              console.warn(
                `Unknown action type ${type} for trigger id "${triggerId}". Skipping.`
              );
            }
          }
          actionMap.set(triggerId, actionList);
        }
      }
    }

    return { actions: actionMap, unknownActionTypes: unknownTypes };
  }

  private readAZActionParam(param: string): number {
    const zCode = 'Z'.charCodeAt(0);
    const aCode = 'A'.charCodeAt(0);
    const base = zCode - aCode + 1;

    return param.length > 1
      ? param.charCodeAt(1) - aCode + (param.charCodeAt(0) - aCode + 1) * base
      : param.charCodeAt(0) - aCode;
  }
}