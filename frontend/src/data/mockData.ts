// Mock data for AeroDine MVP

export interface KPIData {
  revenue: { value: number; trend: number; label: string };
  activeOrders: { value: number; trend: number; label: string };
  tableOccupancy: { value: number; trend: number; label: string };
  customerRating: { value: number; trend: number; label: string };
}

export interface ChartDataPoint {
  time: string;
  revenue: number;
}

export interface RecentOrder {
  id: string;
  tableNumber: number;
  time: string;
  amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  status: 'active' | 'inactive';
}

export interface KDSTicket {
  id: string;
  tableNumber: number;
  orderTime: string;
  elapsedMinutes: number;
  items: Array<{
    name: string;
    quantity: number;
    modifiers?: string[];
  }>;
  status: 'pending' | 'preparing' | 'ready';
}

// KPI Data
export const kpiData: KPIData = {
  revenue: {
    value: 45280,
    trend: 12.5,
    label: 'Revenue',
  },
  activeOrders: {
    value: 24,
    trend: -3.2,
    label: 'Active orders',
  },
  tableOccupancy: {
    value: 68,
    trend: 5.1,
    label: 'Table occupancy',
  },
  customerRating: {
    value: 4.8,
    trend: 0.3,
    label: 'Customer rating',
  },
};

// Chart Data (Revenue by hour)
export const chartData: ChartDataPoint[] = [
  { time: '10:00', revenue: 1200 },
  { time: '11:00', revenue: 2100 },
  { time: '12:00', revenue: 3800 },
  { time: '13:00', revenue: 4200 },
  { time: '14:00', revenue: 3100 },
  { time: '15:00', revenue: 2800 },
  { time: '16:00', revenue: 1900 },
  { time: '17:00', revenue: 2400 },
  { time: '18:00', revenue: 4500 },
  { time: '19:00', revenue: 5200 },
  { time: '20:00', revenue: 4800 },
  { time: '21:00', revenue: 3600 },
];

// Recent Orders
export const recentOrders: RecentOrder[] = [
  {
    id: '1',
    tableNumber: 12,
    time: '2 min ago',
    amount: 145.50,
    status: 'preparing',
  },
  {
    id: '2',
    tableNumber: 8,
    time: '5 min ago',
    amount: 89.00,
    status: 'ready',
  },
  {
    id: '3',
    tableNumber: 15,
    time: '8 min ago',
    amount: 234.75,
    status: 'pending',
  },
  {
    id: '4',
    tableNumber: 3,
    time: '12 min ago',
    amount: 67.50,
    status: 'completed',
  },
  {
    id: '5',
    tableNumber: 20,
    time: '15 min ago',
    amount: 189.25,
    status: 'completed',
  },
];

// Menu Items
export const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Grilled Salmon',
    category: 'Main Course',
    price: 24.99,
    status: 'active',
  },
  {
    id: '2',
    name: 'Caesar Salad',
    category: 'Salads',
    price: 12.50,
    status: 'active',
  },
  {
    id: '3',
    name: 'Margherita Pizza',
    category: 'Pizza',
    price: 16.99,
    status: 'active',
  },
  {
    id: '4',
    name: 'Chocolate Lava Cake',
    category: 'Desserts',
    price: 8.99,
    status: 'active',
  },
  {
    id: '5',
    name: 'Beef Burger',
    category: 'Main Course',
    price: 18.50,
    status: 'active',
  },
  {
    id: '6',
    name: 'Caprese Salad',
    category: 'Salads',
    price: 11.99,
    status: 'inactive',
  },
  {
    id: '7',
    name: 'Pepperoni Pizza',
    category: 'Pizza',
    price: 19.99,
    status: 'active',
  },
  {
    id: '8',
    name: 'Tiramisu',
    category: 'Desserts',
    price: 9.50,
    status: 'active',
  },
  {
    id: '9',
    name: 'Chicken Pasta',
    category: 'Main Course',
    price: 20.99,
    status: 'active',
  },
  {
    id: '10',
    name: 'Greek Salad',
    category: 'Salads',
    price: 13.50,
    status: 'active',
  },
];

// KDS Tickets
export const kdsTickets: KDSTicket[] = [
  {
    id: '1',
    tableNumber: 12,
    orderTime: '12:15',
    elapsedMinutes: 8,
    items: [
      { name: 'Grilled Salmon', quantity: 2, modifiers: ['Extra lemon', 'No butter'] },
      { name: 'Caesar Salad', quantity: 1 },
      { name: 'Chocolate Lava Cake', quantity: 1 },
    ],
    status: 'preparing',
  },
  {
    id: '2',
    tableNumber: 8,
    orderTime: '12:20',
    elapsedMinutes: 3,
    items: [
      { name: 'Margherita Pizza', quantity: 1, modifiers: ['Extra cheese'] },
      { name: 'Greek Salad', quantity: 1 },
    ],
    status: 'pending',
  },
  {
    id: '3',
    tableNumber: 15,
    orderTime: '12:10',
    elapsedMinutes: 13,
    items: [
      { name: 'Beef Burger', quantity: 2, modifiers: ['No pickles', 'Extra bacon'] },
      { name: 'Caesar Salad', quantity: 1 },
    ],
    status: 'preparing',
  },
  {
    id: '4',
    tableNumber: 5,
    orderTime: '12:05',
    elapsedMinutes: 18,
    items: [
      { name: 'Chicken Pasta', quantity: 1 },
      { name: 'Tiramisu', quantity: 2 },
    ],
    status: 'ready',
  },
  {
    id: '5',
    tableNumber: 22,
    orderTime: '12:22',
    elapsedMinutes: 1,
    items: [
      { name: 'Pepperoni Pizza', quantity: 1 },
    ],
    status: 'pending',
  },
  {
    id: '6',
    tableNumber: 3,
    orderTime: '11:55',
    elapsedMinutes: 28,
    items: [
      { name: 'Grilled Salmon', quantity: 1 },
      { name: 'Caesar Salad', quantity: 1 },
    ],
    status: 'ready',
  },
];

// Categories for filtering
export const categories = ['All', 'Main Course', 'Salads', 'Pizza', 'Desserts'];
