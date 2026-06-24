import { FoodItem } from '../types';
import { FoodCard } from './FoodCard';

export const FoodGrid = ({ items }: { items: FoodItem[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {items.map(item => <FoodCard key={item.id} item={item} />)}
  </div>
);
