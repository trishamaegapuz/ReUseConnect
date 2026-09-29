import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  AlertCircle,
  Check,
  CheckCheck,
  Image as ImageIcon,
  MessageCircle,
  RefreshCw,
  Search,
  Send
} from 'lucide-react';

import {
  useLocation
} from 'react-router-dom';

import {
  getSellerConversations,
  getSellerConversation,
  sendSellerMessage,
  markSellerConversationRead
} from '../../services/seller/sellerCommunicationService';

import '../../styles/seller/SellerCommunication.css';


const SellerCommunication = () => {

  const [conversations, setConversations] =
    useState([]);

  const [selectedBuyerId, setSelectedBuyerId] =
    useState(null);

  const [selectedConversation, setSelectedConversation] =
    useState(null);

  const [messageText, setMessageText] =
    useState('');

  const [searchText, setSearchText] =
    useState('');

  const [loadingConversations, setLoadingConversations] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const location =
    useLocation();

  /*
  ============================================================
  TRADE / ORDER COMMUNICATION CONTEXT
  ============================================================

  When coming from:

    Seller Trade & Exchange
          ↓
    Contact Member
          ↓
    /seller/communication?buyerId=3&listingId=8

  listingId = 8 must remain the active listing context.

  This must NOT be replaced by an older message's listing_id.
  ============================================================
  */

  const [
    communicationContext,
    setCommunicationContext
  ] = useState({
    buyerId: null,
    listingId: null
  });


  /* ============================================================
     LOAD CONVERSATIONS
  ============================================================ */

  const loadConversations =
    useCallback(
      async (
        showRefresh = false
      ) => {

        try {

          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoadingConversations(true);
          }

          setError('');

          const response =
            await getSellerConversations();

          if (!response?.success) {
            throw new Error(
              response?.message ||
              'Failed to load conversations.'
            );
          }

          const list =
            Array.isArray(
              response.conversations
            )
              ? response.conversations
              : [];

          setConversations(list);


          /*
          --------------------------------------------------------
          Do NOT clear the selected buyer just because the
          conversation list does not immediately contain them.

          The Trade & Exchange flow may have just opened a
          conversation context.
          --------------------------------------------------------
          */

        } catch (err) {

          console.error(
            'LOAD SELLER CONVERSATIONS ERROR:',
            err
          );

          setError(
            err?.message ||
            'Unable to load conversations.'
          );

        } finally {

          setLoadingConversations(false);
          setRefreshing(false);

        }

      },
      []
    );


  /* ============================================================
     LOAD CONVERSATION
  ============================================================ */

  const loadConversation =
    useCallback(
      async (buyerId) => {

        if (!buyerId) {
          return;
        }

        try {

          setLoadingMessages(true);
          setError('');

          const response =
            await getSellerConversation(
              buyerId
            );

          if (!response?.success) {
            throw new Error(
              response?.message ||
              'Failed to load conversation.'
            );
          }

          setSelectedConversation(
            response
          );


          setConversations(
            (current) =>
              current.map(
                (conversation) => {

                  if (
                    Number(
                      conversation.buyer_id
                    ) !==
                    Number(buyerId)
                  ) {
                    return conversation;
                  }

                  return {
                    ...conversation,
                    unread_count: 0
                  };

                }
              )
          );


          try {

            await markSellerConversationRead(
              buyerId
            );

          } catch (readError) {

            console.warn(
              'MARK CONVERSATION READ ERROR:',
              readError
            );

          }

        } catch (err) {

          console.error(
            'LOAD SELLER CONVERSATION ERROR:',
            err
          );

          setError(
            err?.message ||
            'Unable to load conversation.'
          );

        } finally {

          setLoadingMessages(false);

        }

      },
      []
    );


  /* ============================================================
     INITIAL CONVERSATIONS
  ============================================================ */

  useEffect(() => {

    loadConversations();

  }, [
    loadConversations
  ]);


  /* ============================================================
     READ URL COMMUNICATION CONTEXT
  ============================================================ */

  useEffect(() => {

    const params =
      new URLSearchParams(
        location.search
      );


    const buyerId =
      Number(
        params.get('buyerId') || 0
      );


    const listingId =
      Number(
        params.get('listingId') || 0
      );


    /*
    ------------------------------------------------------------
    Trade & Exchange → Contact Member
    ------------------------------------------------------------
    */

    if (
      Number.isInteger(buyerId) &&
      buyerId > 0
    ) {

      const nextContext = {
        buyerId,

        listingId:
          Number.isInteger(listingId) &&
          listingId > 0
            ? listingId
            : null
      };


      console.log(
        'SELLER COMMUNICATION CONTEXT:',
        nextContext
      );


      setCommunicationContext(
        nextContext
      );


      setSelectedBuyerId(
        buyerId
      );


      loadConversation(
        buyerId
      );

    } else {

      setCommunicationContext({
        buyerId: null,
        listingId: null
      });

    }

  }, [
    location.search,
    loadConversation
  ]);


  /* ============================================================
     SELECT NORMAL CONVERSATION
  ============================================================ */

  const handleSelectConversation =
    (buyerId) => {

      /*
      ----------------------------------------------------------
      If seller manually selects a conversation from the left
      sidebar, remove the Trade listing context.

      This prevents listingId from another Trade post from
      accidentally being attached to an unrelated conversation.
      ----------------------------------------------------------
      */

      setCommunicationContext({
        buyerId: buyerId,
        listingId: null
      });


      setSelectedBuyerId(
        buyerId
      );


      loadConversation(
        buyerId
      );

    };


  /* ============================================================
     SEND MESSAGE
  ============================================================ */

  const handleSendMessage =
    async (event) => {

      event.preventDefault();


      const trimmedMessage =
        messageText.trim();


      if (
        !trimmedMessage ||
        !selectedConversation?.buyer
      ) {
        return;
      }


      const receiverId =
        selectedConversation.buyer.user_id;


      /*
      ----------------------------------------------------------
      IMPORTANT LISTING PRIORITY
      ----------------------------------------------------------

      If this conversation was opened from:

        Trade & Exchange
              ↓
        Contact Member
              ↓
        listingId=8

      then listingId=8 MUST be used.

      An old Shoe message must NOT override it.
      ----------------------------------------------------------
      */

      const contextListingId =
        Number(
          communicationContext?.listingId ||
          0
        );


      const lastMessage =
        selectedConversation.messages?.[
          selectedConversation.messages.length - 1
        ];


      const oldListingId =
        Number(
          lastMessage?.listing_id ||
          0
        );


      const listingId =
        Number.isInteger(
          contextListingId
        ) &&
        contextListingId > 0

          ? contextListingId

          : (
              Number.isInteger(
                oldListingId
              ) &&
              oldListingId > 0
                ? oldListingId
                : null
            );


      /*
      ----------------------------------------------------------
      DEBUG
      ----------------------------------------------------------
      */

      console.log(
        'SELLER MESSAGE LISTING CONTEXT:',
        {
          communicationListingId:
            communicationContext?.listingId,

          oldMessageListingId:
            lastMessage?.listing_id,

          finalListingId:
            listingId
        }
      );


      try {

        setSending(true);
        setError('');


        await sendSellerMessage({

          receiverId,

          message:
            trimmedMessage,

          /*
          IMPORTANT:
          Current Trade listing takes priority.
          */

          listingId,

          orderId:
            lastMessage?.order_id ||
            null

        });


        setMessageText('');


        /*
        --------------------------------------------------------
        Reload conversation.

        The newly inserted message should now contain the
        correct listing_id.
        --------------------------------------------------------
        */

        await loadConversation(
          receiverId
        );


        await loadConversations(
          true
        );


      } catch (err) {

        console.error(
          'SEND SELLER MESSAGE ERROR:',
          err
        );

        setError(
          err?.message ||
          'Unable to send message.'
        );

      } finally {

        setSending(false);

      }

    };


  /* ============================================================
     FILTER CONVERSATIONS
  ============================================================ */

  const filteredConversations =
    useMemo(() => {

      const query =
        searchText
          .trim()
          .toLowerCase();


      if (!query) {
        return conversations;
      }


      return conversations.filter(
        (conversation) => {

          const name =
            conversation.buyer_name ||
            `${conversation.first_name || ''} ${
              conversation.last_name || ''
            }`;


          const latestMessage =
            conversation.latest_message ||
            '';


          const listingTitle =
            conversation.listing_title ||
            '';


          return (

            name
              .toLowerCase()
              .includes(query) ||

            latestMessage
              .toLowerCase()
              .includes(query) ||

            listingTitle
              .toLowerCase()
              .includes(query)

          );

        }
      );

    }, [
      conversations,
      searchText
    ]);


  /* ============================================================
     HELPERS
  ============================================================ */

  const getInitials =
    (
      firstName,
      lastName
    ) => {

      const first =
        firstName?.charAt(0) ||
        '';

      const last =
        lastName?.charAt(0) ||
        '';

      return `${first}${last}`.toUpperCase();

    };


  const formatTime =
    (dateValue) => {

      if (!dateValue) {
        return '';
      }


      const date =
        new Date(dateValue);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return '';
      }


      return date.toLocaleTimeString(
        [],
        {
          hour: 'numeric',
          minute: '2-digit'
        }
      );

    };


  const formatConversationDate =
    (dateValue) => {

      if (!dateValue) {
        return '';
      }


      const date =
        new Date(dateValue);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return '';
      }


      const today =
        new Date();


      const sameDay =
        date.toDateString() ===
        today.toDateString();


      if (sameDay) {

        return formatTime(
          dateValue
        );

      }


      return date.toLocaleDateString(
        [],
        {
          month: 'short',
          day: 'numeric'
        }
      );

    };


  /* ============================================================
     SELECTED BUYER / MESSAGES
  ============================================================ */

  const selectedBuyer =
    selectedConversation?.buyer;


  const selectedMessages =
    selectedConversation?.messages ||
    [];


  return (

    <div className="seller-communication">

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="communication-error">

          <AlertCircle
            size={18}
          />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
          >
            ×
          </button>

        </div>

      )}


      <div className="communication-container">

        {/* =====================================================
            CONVERSATION LIST
        ====================================================== */}

        <aside className="communication-sidebar">

          <div className="communication-sidebar-header">

            <div>

              <h2>
                Messages
              </h2>

              <p>
                Connect with your buyers
              </p>

            </div>


            <button
              type="button"
              className="refresh-button"
              onClick={() =>
                loadConversations(true)
              }
              disabled={refreshing}
              title="Refresh"
            >

              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? 'spin-icon'
                    : ''
                }
              />

            </button>

          </div>


          <div className="communication-search">

            <Search
              size={18}
            />

            <input
              type="text"
              placeholder="Search messages..."
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
            />

          </div>


          <div className="conversation-list">

            {loadingConversations ? (

              <div className="conversation-loading">

                <RefreshCw
                  size={22}
                  className="spin-icon"
                />

                <span>
                  Loading messages...
                </span>

              </div>

            ) : filteredConversations.length === 0 ? (

              <div className="empty-conversations">

                <MessageCircle
                  size={42}
                />

                <h3>
                  No conversations
                </h3>

                <p>
                  Your buyer conversations
                  will appear here.
                </p>

              </div>

            ) : (

              filteredConversations.map(
                (conversation) => {

                  const buyerId =
                    conversation.buyer_id;


                  const buyerName =
                    conversation.buyer_name ||
                    `${conversation.first_name || ''} ${
                      conversation.last_name || ''
                    }`.trim() ||
                    'Buyer';


                  const initials =
                    getInitials(
                      conversation.first_name,
                      conversation.last_name
                    );


                  const unreadCount =
                    Number(
                      conversation.unread_count ||
                      0
                    );


                  const isSelected =
                    Number(
                      selectedBuyerId
                    ) ===
                    Number(buyerId);


                  return (

                    <button
                      type="button"
                      key={buyerId}
                      className={`conversation-item ${
                        isSelected
                          ? 'active'
                          : ''
                      }`}
                      onClick={() =>
                        handleSelectConversation(
                          buyerId
                        )
                      }
                    >

                      <div className="conversation-avatar">

                        {conversation.profile_image ? (

                          <img
                            src={
                              conversation.profile_image
                            }
                            alt={
                              buyerName
                            }
                          />

                        ) : (

                          <span>
                            {initials ||
                              'B'}
                          </span>

                        )}

                      </div>


                      <div className="conversation-content">

                        <div className="conversation-top">

                          <strong>
                            {buyerName}
                          </strong>

                          <span>
                            {formatConversationDate(
                              conversation.latest_message_at
                            )}
                          </span>

                        </div>


                        {conversation.listing_title && (

                          <div className="conversation-listing">

                            {conversation.listing_title}

                          </div>

                        )}


                        <div className="conversation-bottom">

                          <p>
                            {conversation.latest_message ||
                              'No message'}
                          </p>


                          {unreadCount > 0 && (

                            <span className="unread-badge">

                              {unreadCount >
                              99
                                ? '99+'
                                : unreadCount}

                            </span>

                          )}

                        </div>

                      </div>

                    </button>

                  );

                }
              )

            )}

          </div>

        </aside>


        {/* =====================================================
            CHAT AREA
        ====================================================== */}

        <section className="communication-chat">

          {!selectedConversation ? (

            <div className="chat-empty-state">

              <div className="chat-empty-icon">

                <MessageCircle
                  size={42}
                />

              </div>


              <h2>
                Select a conversation
              </h2>


              <p>
                Choose a buyer from the
                message list to view your
                conversation.
              </p>

            </div>

          ) : (

            <>

              {/* =================================================
                  CHAT HEADER
              ================================================= */}

              <div className="chat-header">

                <div className="chat-buyer-info">

                  <div className="chat-avatar">

                    {selectedBuyer?.profile_image ? (

                      <img
                        src={
                          selectedBuyer.profile_image
                        }
                        alt={
                          selectedBuyer.full_name ||
                          'Buyer'
                        }
                      />

                    ) : (

                      <span>

                        {getInitials(
                          selectedBuyer?.first_name,
                          selectedBuyer?.last_name
                        ) || 'B'}

                      </span>

                    )}

                  </div>


                  <div>

                    <h3>

                      {selectedBuyer?.full_name ||
                        `${selectedBuyer?.first_name || ''} ${
                          selectedBuyer?.last_name || ''
                        }`.trim() ||
                        'Buyer'}

                    </h3>


                    <div className="buyer-status">

                      <span className="status-dot" />

                      <span>

                        {selectedBuyer?.status ||
                          'Buyer'}

                      </span>

                    </div>

                  </div>

                </div>

              </div>


              {/* =================================================
                  MESSAGES
              ================================================== */}

              <div className="messages-area">

                {loadingMessages ? (

                  <div className="messages-loading">

                    <RefreshCw
                      size={24}
                      className="spin-icon"
                    />

                    <span>
                      Loading conversation...
                    </span>

                  </div>

                ) : selectedMessages.length === 0 ? (

                  <div className="no-messages">

                    <MessageCircle
                      size={34}
                    />

                    <p>
                      No messages yet.
                    </p>

                    <span>
                      Send a message to start
                      the conversation.
                    </span>

                  </div>

                ) : (

                  selectedMessages.map(
                    (message) => {

                      const isMine =
                        Boolean(
                          message.is_mine
                        );


                      return (

                        <div
                          key={
                            message.message_id
                          }
                          className={`message-row ${
                            isMine
                              ? 'mine'
                              : 'received'
                          }`}
                        >

                          <div
                            className={`message-bubble ${
                              isMine
                                ? 'mine'
                                : 'received'
                            }`}
                          >

                            {message.listing_title && (

                              <div className="message-listing-card">

                                {message.listing_image ? (

                                  <img
                                    src={
                                      message.listing_image
                                    }
                                    alt={
                                      message.listing_title
                                    }
                                  />

                                ) : (

                                  <div className="message-listing-placeholder">

                                    <ImageIcon
                                      size={20}
                                    />

                                  </div>

                                )}


                                <div>

                                  <strong>
                                    {
                                      message.listing_title
                                    }
                                  </strong>


                                  {message.listing_price !==
                                    null &&
                                    message.listing_price !==
                                      undefined && (

                                      <span>

                                        ₱
                                        {Number(
                                          message.listing_price
                                        ).toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                          }
                                        )}

                                      </span>

                                    )}

                                </div>

                              </div>

                            )}


                            <p>
                              {
                                message.message
                              }
                            </p>


                            <div className="message-meta">

                              <span>
                                {formatTime(
                                  message.created_at
                                )}
                              </span>


                              {isMine && (

                                message.is_read ? (

                                  <CheckCheck
                                    size={15}
                                  />

                                ) : (

                                  <Check
                                    size={15}
                                  />

                                )

                              )}

                            </div>

                          </div>

                        </div>

                      );

                    }
                  )

                )}

              </div>


              {/* =================================================
                  MESSAGE INPUT
              ================================================== */}

              <form
                className="message-input-area"
                onSubmit={
                  handleSendMessage
                }
              >

                <div className="message-input-wrapper">

                  <textarea
                    value={messageText}
                    onChange={(event) =>
                      setMessageText(
                        event.target.value
                      )
                    }
                    placeholder="Type your message..."
                    rows={1}
                    disabled={sending}
                    onKeyDown={(event) => {

                      if (
                        event.key ===
                          'Enter' &&
                        !event.shiftKey
                      ) {

                        event.preventDefault();

                        handleSendMessage(
                          event
                        );

                      }

                    }}
                  />


                  <button
                    type="submit"
                    className="send-message-button"
                    disabled={
                      sending ||
                      !messageText.trim()
                    }
                    title="Send message"
                  >

                    {sending ? (

                      <RefreshCw
                        size={19}
                        className="spin-icon"
                      />

                    ) : (

                      <Send
                        size={19}
                      />

                    )}

                  </button>

                </div>


                <div className="message-input-hint">

                  Press Enter to send ·
                  Shift + Enter for a new line

                </div>

              </form>

            </>

          )}

        </section>

      </div>

    </div>

  );

};


export default SellerCommunication;