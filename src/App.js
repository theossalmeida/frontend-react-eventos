import React, { useState, useEffect } from 'react';
import {format, isEqual, parseISO} from 'date-fns';
import './index.css';


function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [showNewCommentForm, setShowNewCommentForm] = useState(null);

  // Form states
  const [newEvent, setNewEvent] = useState({
    nome: '',
    data: '',
    duracao_qtd: '',
    duracao_tipo: 'dias'
  });

  const [newComment, setNewComment] = useState({
    nome_usuario: '',
    comentario: '',
    classificacao: 3
  });

  const baseUrl = 'https://api-eventos-env.eba-hesu7ymk.us-east-2.elasticbeanstalk.com/';

  // Fetch events and comments from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch events
        const eventsResponse = await fetch(baseUrl + 'eventos');
        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch events');
        }
        const eventsData = await eventsResponse.json();

        // Garante que todos os eventos tenham a propriedade comentarios
        const eventsWithComments = eventsData.map(event => ({
          ...event,
          comentarios: event.comentarios || []
        }));

        setEvents(eventsWithComments);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle expanded event
  const toggleEvent = (event) => {
    setExpandedEventId(expandedEventId === event.id ? null : event.id);
    setSelectedEvent(event);
  };

  // Filter events based on search term and date range
  const filteredEvents = events.filter(event => {
    // Check if event and event.name exist before calling toLowerCase()
    const matchesSearch = !searchTerm ||
        (event &&
            event.nome &&
            event.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDateRange = true;

    // Check if event.date exists before parsing
    if (event && event.data) {
      const eventDate = parseISO(event.data);
      if (dateFilter) {
        matchesDateRange = isEqual(eventDate, parseISO(dateFilter))
      } else if (dateFilter) {
        matchesDateRange = false;
      }
    }
    return matchesSearch && matchesDateRange;
  });

  // Order events by newest to oldest
  const sortedEvents = filteredEvents.sort((a, b) => {
    const dateA = a.data ? new Date(a.data) : 0;
    const dateB = b.data ? new Date(b.data) : 0;
    return dateB - dateA;
  });
  // Handle new event submission
  const handleSubmitNewEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(baseUrl + 'eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent)
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const createdEvent = await response.json();
      // Garante que o evento criado tenha a propriedade comentarios
      const eventWithComments = {
        ...createdEvent,
        comentarios: createdEvent.comentarios || []
      };

      setEvents([...events, eventWithComments]);
      setShowNewEventForm(false);
      setNewEvent({
        nome: '',
        data: '',
        duracao_qtd: '',
        duracao_tipo: 'dias'
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle new comment submission
  const handleSubmitNewComment = async (e, eventId) => {
    e.preventDefault();
    try {
      const commentData = {
        ...newComment,
        id_evento: eventId,
        classificacao: Number(newComment.classificacao)
      };

      const response = await fetch(baseUrl + 'comentarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData)
      });

      if (!response.ok) {
        throw new Error('Failed to create comment');
      }

      const createdComment = await response.json();

      // Update the events state with the new comment
      const updatedEvents = events.map(event => {
        if (event.id === eventId) {
          return {
            ...event,
            comentarios: [...(event.comentarios || []), createdComment]
          };
        }
        return event;
      });

      setEvents(updatedEvents);

      // If the selected event is the one being commented on, update it too
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent({
          ...selectedEvent,
          comentarios: [...(selectedEvent.comentarios || []), createdComment]
        });
      }

      setShowNewCommentForm(null);
      setNewComment({
        nome_usuario: '',
        comentario: '',
        classificacao: 3
      });
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;

  // Função segura para calcular a classificação média
  const calculateAverageRating = (event) => {
    if (!event || !event.comentarios || event.comentarios.length === 0) {
      return 'N/A';
    }

    return (
        event.comentarios
            .reduce((acc, com) => acc + (com.classificacao || 0), 0) /
        event.comentarios.length
    ).toFixed(1);
  };

  return (
      <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Eventos e comentários</h1>
          <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              onClick={() => setShowNewEventForm(true)}
          >
            Adicionar Evento
          </button>
        </div>

        {/* New Event Form Modal */}
        {showNewEventForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Adicionar Novo Evento</h2>
                <form onSubmit={handleSubmitNewEvent}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Nome do Evento</label>
                    <input
                        type="text"
                        required
                        value={newEvent.nome}
                        onChange={(e) => setNewEvent({...newEvent, nome: e.target.value})}
                        className="w-full p-2 border rounded"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Data</label>
                    <input
                        type="date"
                        required
                        value={newEvent.data}
                        onChange={(e) => setNewEvent({...newEvent, data: e.target.value})}
                        className="w-full p-2 border rounded"
                    />
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Duração (quantidade)</label>
                      <input
                          type="number"
                          required
                          min="1"
                          value={newEvent.duracao_qtd}
                          onChange={(e) => setNewEvent({...newEvent, duracao_qtd: e.target.value})}
                          className="w-full p-2 border rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Tipo</label>
                      <select
                          value={newEvent.duracao_tipo}
                          onChange={(e) => setNewEvent({...newEvent, duracao_tipo: e.target.value})}
                          className="w-full p-2 border rounded"
                      >
                        <option value="horas">Horas</option>
                        <option value="dias">Dias</option>
                        <option value="semanas">Semanas</option>
                        <option value="meses">Meses</option>
                        <option value="anos">Anos</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={() => setShowNewEventForm(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Salvar Evento
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow">
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium mb-1">Pesquisar</label>
            <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium mb-1">Data:</label>
            <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full">
            <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 border-b text-left font-semibold">Nome</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Data</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Duração</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Classificação</th>
              <th className="py-3 px-4 border-b text-left font-semibold">Actions</th>
            </tr>
            </thead>
            <tbody>
            {sortedEvents.length > 0 ? (
                sortedEvents.map(event => (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4 border-b">{event.nome || 'Unnamed Event'}</td>
                        <td className="py-3 px-4 border-b">
                          {event.data ? format(parseISO(event.data), 'dd/MM/yyyy') : 'No date'}
                        </td>
                        <td className="py-3 px-4 border-b">{event.duracao_qtd + ' ' + event.duracao_tipo || 'Sem info de duração'}</td>
                        <td className="py-3 px-4 border-b">
                          <div className="flex items-center">
                            <span className="text-yellow-500 mr-1">★</span>
                            <span>{calculateAverageRating(event) !== 'N/A' ? calculateAverageRating(event) + '/5' : 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 border-b">
                          <button
                              onClick={() => toggleEvent(event)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                          >
                            {expandedEventId === event.id? 'Esconder comentarios' : 'Visualizar comentários'}
                          </button>
                        </td>
                      </tr>

                      {/* Comments Section (Expandable) */}
                      {expandedEventId === event.id && (
                          <tr>
                            <td colSpan="5" className="py-4 px-4 border-b bg-gray-50">
                              <div className="p-4">
                                <h3 className="font-bold text-lg mb-4">Comentários</h3>
                                {selectedEvent && selectedEvent.comentarios && selectedEvent.comentarios.length > 0 ? (
                                    <div className="space-y-4">
                                      {selectedEvent.comentarios.map(comment => (
                                          <div key={comment.id} className="p-4 rounded-lg border bg-white shadow-sm">
                                            <div className="flex items-center mb-2">
                                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">
                                                {comment.nome_usuario ? comment.nome_usuario.charAt(0).toUpperCase() : 'A'}
                                              </div>
                                              <div>
                                                <div className="font-semibold">{comment.nome_usuario || 'Anônimo'}</div>
                                                <div className="text-xs text-gray-500 flex items-center">
                                                  <span className="mr-1 text-yellow-500">★</span>
                                                  {comment.classificacao}/5
                                                </div>
                                              </div>
                                            </div>
                                            <div className="ml-12">
                                              <p className="text-gray-800">{comment.comentario || 'Sem texto no comentário'}</p>
                                            </div>
                                          </div>
                                      ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 p-4 bg-white rounded-lg border">Sem comentários para esse evento.</div>
                                )}

                                {/* Add new comment button */}
                                <div className="mt-4">
                                  <button
                                      onClick={() => setShowNewCommentForm(event.id)}
                                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition flex items-center"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    Adicionar comentário
                                  </button>
                                </div>

                                {/* New Comment Form Modal */}
                                {showNewCommentForm === event.id && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                                        <h2 className="text-xl font-bold mb-4">Adicionar Comentário</h2>
                                        <form onSubmit={(e) => handleSubmitNewComment(e, event.id)}>
                                          <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Nome (opcional)</label>
                                            <input
                                                type="text"
                                                value={newComment.nome_usuario}
                                                onChange={(e) => setNewComment({...newComment, nome_usuario: e.target.value})}
                                                className="w-full p-2 border rounded"
                                                placeholder="Anônimo"
                                            />
                                          </div>

                                          <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Comentário</label>
                                            <textarea
                                                required
                                                value={newComment.comentario}
                                                onChange={(e) => setNewComment({...newComment, comentario: e.target.value})}
                                                className="w-full p-2 border rounded min-h-32"
                                                placeholder="Escreva seu comentário..."
                                            ></textarea>
                                          </div>

                                          <div className="mb-4">
                                            <label className="block text-sm font-medium mb-1">Classificação (0-5)</label>
                                            <div className="flex items-center">
                                              <input
                                                  type="range"
                                                  min="0"
                                                  max="5"
                                                  step="1"
                                                  value={newComment.classificacao}
                                                  onChange={(e) => setNewComment({...newComment, classificacao: e.target.value})}
                                                  className="w-full mr-2"
                                              />
                                              <span className="text-yellow-500 flex items-center">
                                              <span className="mr-1">★</span>
                                                {newComment.classificacao}/5
                                            </span>
                                            </div>
                                          </div>

                                          <div className="flex justify-end gap-2 mt-6">
                                            <button
                                                type="button"
                                                onClick={() => setShowNewCommentForm(null)}
                                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                                            >
                                              Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                              Publicar
                                            </button>
                                          </div>
                                        </form>
                                      </div>
                                    </div>
                                )}
                              </div>
                            </td>
                          </tr>
                      )}
                    </React.Fragment>
                ))
            ) : (
                <tr>
                  <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                    Sem eventos para o filtro selecionado.
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
  );
}

export default App;