export type RoomInfo = {
  id: number | string;
  status: string;
  playerFirstId: number | null;
  playerSecondId?: number | null;
};

interface AvailableRoomsListProps {
  rooms: RoomInfo[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: string;
  onJoinRoom: (roomId: number | string) => void;
}

const statusLabels: Record<string, string> = {
  WAITING_SECOND_USER: 'ОЖИДАНИЕ СОПЕРНИКА',
  PLAYER_DISCONNECTED: 'ИГРОК ОТКЛЮЧИЛСЯ',
  FINISHED: 'ИГРА ЗАВЕРШЕНА',
  ALL_USERS_JOINED: 'ИДЕТ ИГРА',
};

export const AvailableRoomsList = ({
  rooms, loading, error, searchQuery, statusFilter, onJoinRoom,
}: AvailableRoomsListProps) => {
  if (loading) {
    return <div className="loading" role="status">Загрузка...</div>;
  }

  if (error) {
    return <div className="error" role="alert">{error}</div>;
  }

  const query = searchQuery.trim();
  const filteredRooms = rooms.filter(room =>
    (room.id.toString().includes(query) ||
      (room.playerSecondId != null && room.playerSecondId.toString().includes(query))) &&
    (statusFilter === '' || room.status === statusFilter)
  );

  if (filteredRooms.length === 0) {
    return (
      <div className="no-rooms" role="status">
        {rooms.length === 0 && query === '' && statusFilter === ''
          ? 'Нет комнат'
          : 'Комнаты не найдены'}
      </div>
    );
  }

  return (
    <table className="rooms-table">
      <thead>
        <tr>
          <th>ID комнаты</th>
          <th>ID соперника</th>
          <th>Статус</th>
          <th>Действие</th>
        </tr>
      </thead>
      <tbody>
        {filteredRooms.map(room => (
          <tr key={room.id}>
            <td>{room.id}</td>
            <td>{room.playerSecondId ?? '—'}</td>
            <td>{statusLabels[room.status] ?? room.status}</td>
            <td>
              {room.status === 'WAITING_SECOND_USER' ? (
                <button className="join-button" onClick={() => onJoinRoom(room.id)}>
                  Зайти
                </button>
              ) : (
                <span>Не доступно</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
