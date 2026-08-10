import type { Zone } from "../../types";

export interface CommerceAdresseFavorite {
  id: string;
  commerceId: string;
  label: string;
  adresse: string;
  repere: string | null;
  zone: Zone | null;
  createdAt: string;
}

export interface CommercePointDepart {
  id: string;
  commerceId: string;
  label: string;
  adresse: string;
  repere: string | null;
  zone: Zone | null;
  latitude: number | null;
  longitude: number | null;
  actif: boolean;
  createdAt: string;
}
