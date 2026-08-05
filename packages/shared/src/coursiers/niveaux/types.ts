export interface NiveauCoursier {
  id: string;
  code: string;
  nom: string;
  seuilLivraisonsMin: number;
  couleur: string;
  icone: string | null;
  ordre: number;
  createdAt: string;
  updatedAt: string;
}
