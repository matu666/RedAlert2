import React, { useRef, useState, useEffect } from "react";
import { List, ListItem } from "gui/component/List";
import { Select } from "gui/component/Select";
import { Option } from "gui/component/Option";

enum SortType {
  None = "",
  NameAsc = "nameAsc",
  NameDesc = "nameDesc",
  MaxSlotsAsc = "maxSlotsAsc",
  MaxSlotsDesc = "maxSlotsDesc",
}

interface MapData {
  mapTitle: string;
  maxSlots: number;
  fileName: string;
  [key: string]: any;
}

interface GameMode {
  id: number;
  label: string;
  [key: string]: any;
}

interface MapSelProps {
  strings: any;
  gameModes: GameMode[];
  maps: MapData[];
  selectedGameMode: GameMode;
  selectedMapName: string;
  initialSortType: SortType;
  onSelectGameMode: (gameMode: GameMode) => void;
  onSelectMap: (map: MapData) => void;
  onSelectSort: (sortType: SortType) => void;
}

const sortMaps = (maps: MapData[], sortType: SortType): MapData[] => {
  switch (sortType) {
    case SortType.None:
      return maps;
    case SortType.NameAsc:
      return maps.sort((a, b) => a.mapTitle.localeCompare(b.mapTitle));
    case SortType.NameDesc:
      return maps.sort((a, b) => b.mapTitle.localeCompare(a.mapTitle));
    case SortType.MaxSlotsAsc:
      return maps.sort((a, b) => a.maxSlots - b.maxSlots);
    case SortType.MaxSlotsDesc:
      return maps.sort((a, b) => b.maxSlots - a.maxSlots);
    default:
      throw new Error(`Unsupported sort type "${sortType}"`);
  }
};

export const MapSel: React.FC<MapSelProps> = ({
  strings,
  gameModes,
  maps,
  selectedGameMode,
  selectedMapName,
  initialSortType,
  onSelectGameMode,
  onSelectMap,
  onSelectSort,
}) => {
  const selectedRef = useRef<HTMLElement>(null);
  const [filteredMaps, setFilteredMaps] = useState<MapData[]>(maps);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [sortType, setSortType] = useState<SortType>(initialSortType);

  useEffect(() => {
    updateFilteredMaps();
  }, [maps, searchFilter, sortType]);

  useEffect(() => {
    const timeout = setTimeout(() => selectedRef.current?.scrollIntoView(), 50);
    return () => clearTimeout(timeout);
  }, [maps]);

  const updateFilteredMaps = () => {
    const filtered = maps.filter((map) =>
      map.mapTitle.toLowerCase().includes(searchFilter.toLowerCase()),
    );
    setFilteredMaps(sortMaps(filtered, sortType));
  };

  return React.createElement(
    "div",
    { className: "map-sel-form" },
    React.createElement(
      "div",
      { className: "map-sel-title" },
      strings.get("GUI:SelectEngagement"),
    ),
    React.createElement(
      "div",
      { className: "map-sel-body" },
      React.createElement(
        "div",
        { className: "map-sel-game-mode" },
        React.createElement(
          List,
          { title: strings.get("GUI:GameMode"), className: "game-mode-list" },
          gameModes.map((gameMode) =>
            React.createElement(
              ListItem,
              {
                key: gameMode.id,
                selected: selectedGameMode?.id === gameMode.id,
                onClick: () => onSelectGameMode(gameMode),
              },
              strings.get(gameMode.label),
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "map-sel-maps" },
        React.createElement(
          "div",
          { className: "map-sel-controls" },
          React.createElement("input", {
            type: "text",
            placeholder: strings.get("GUI:SearchMaps"),
            value: searchFilter,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchFilter(e.target.value),
            className: "map-search-input",
          }),
          React.createElement(
            Select,
            {
              value: sortType,
              onChange: (value: SortType) => {
                setSortType(value);
                onSelectSort(value);
              },
            },
            React.createElement(Option, {
              value: SortType.None,
              label: strings.get("GUI:SortNone"),
            }),
            React.createElement(Option, {
              value: SortType.NameAsc,
              label: strings.get("GUI:SortNameAsc"),
            }),
            React.createElement(Option, {
              value: SortType.NameDesc,
              label: strings.get("GUI:SortNameDesc"),
            }),
            React.createElement(Option, {
              value: SortType.MaxSlotsAsc,
              label: strings.get("GUI:SortSlotsAsc"),
            }),
            React.createElement(Option, {
              value: SortType.MaxSlotsDesc,
              label: strings.get("GUI:SortSlotsDesc"),
            }),
          ),
        ),
        React.createElement(
          List,
          { title: strings.get("GUI:Maps"), className: "map-list" },
          filteredMaps.map((map) => {
            const isSelected = map.fileName === selectedMapName;
            return React.createElement(
              ListItem,
              {
                key: map.fileName,
                selected: isSelected,
                innerRef: isSelected ? selectedRef : null,
                onClick: () => onSelectMap(map),
                onDoubleClick: () => onSelectMap(map),
              },
              React.createElement(
                "div",
                { className: "map-info" },
                React.createElement(
                  "div",
                  { className: "map-title" },
                  map.mapTitle,
                ),
                React.createElement(
                  "div",
                  { className: "map-slots" },
                  strings.get("GUI:MaxPlayers", map.maxSlots),
                ),
              ),
            );
          }),
        ),
      ),
    ),
  );
};
