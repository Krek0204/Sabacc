import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import './AvailableRoomsPage.css';
import { selectCurrentUser } from '@/features/Auth/model/selectors/authSelector';
import Auth from '@/features/Auth/ui/Auth';
import type { RoomState } from '@/entities/Room/types/room';

import { AvailableRoomsList, type RoomInfo } from './AvailableRoomsList';

const AvailableRoomsPage: React.FC = () => {
  console.log('AvailableRoomsPage рендерится');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [showAuth, setShowAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); //  Поиска
  const [statusFilter, setStatusFilter] = useState('');//  Фильтра

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${__API__}/v1/room/all`)
      .then((res) => {
        const formattedRooms: RoomInfo[] = res.data.map((room: RoomState) => ({
          id: room.id,
          status: room.status,
          playerFirstId: room.playerFirst?.id ?? null,
          playerSecondId: room.playerSecond?.id ?? null,
        }));

        setRooms(formattedRooms);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Ошибка загрузки комнат');
        setLoading(false);
      });
  }, []);

  const handleJoinRoom = (roomId: number | string) => {
    if (!currentUser) {
      setShowAuth(true);
      localStorage.setItem('redirectAfterLogin', `/in-game?roomId=${roomId}`);
      return;
    }
    navigate(`/in-game?roomId=${roomId}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value);
  };


  return (
    <div className="background-container">
      <div className="rooms-container">
        {showAuth && <Auth />}

        <div className="rooms-header">
        <div className="status-filter">
              <label htmlFor="statusFilter">Статус комнаты:</label>
              <select id="statusFilter" value={statusFilter} onChange={handleStatusFilterChange}>
                <option value="">Все</option>
                <option value="WAITING_SECOND_USER">Ожидание соперника</option>
                <option value="PLAYER_DISCONNECTED">Игрок отключился</option>
                <option value="FINISHED">Игра завершена</option>
                <option value="ALL_USERS_JOINED">Все пользователи подключены</option>
                {/* Добавьте другие статусы по необходимости */}
              </select>
            </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Поиск"
              aria-label="Поиск по ID комнаты или соперника"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button>
               {/* Тут надо добавить иконку поиска */}
            </button>
          </div>
        </div>


        <AvailableRoomsList
          rooms={rooms}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onJoinRoom={handleJoinRoom}
        />

        <button className="back-button" onClick={handleBack}>
          Вернуться
        </button>
      </div>
    </div>
  );
};

export default AvailableRoomsPage;
