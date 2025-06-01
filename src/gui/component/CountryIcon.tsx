import React from 'react';
import { RANDOM_COUNTRY_NAME, OBS_COUNTRY_NAME } from '@/game/gameopts/constants';
import { Image } from '@/gui/component/Image';

const countryIcons = new Map<string, string>()
  .set("Americans", "usai.pcx")
  .set("French", "frai.pcx")
  .set("Germans", "geri.pcx")
  .set("British", "gbri.pcx")
  .set("Russians", "rusi.pcx")
  .set("Confederation", "lati.pcx")
  .set("Africans", "djbi.pcx")
  .set("Arabs", "arbi.pcx")
  .set("Alliance", "japi.pcx")
  .set(RANDOM_COUNTRY_NAME, "rani.pcx")
  .set(OBS_COUNTRY_NAME, "obsi.pcx");

interface CountryIconProps {
  country: string;
}

export const CountryIcon: React.FC<CountryIconProps> = ({ country }) => {
  const iconSrc = countryIcons.get(country);
  
  return (
    <div className="player-country-icon">
      {iconSrc && <Image src={iconSrc} />}
    </div>
  );
};