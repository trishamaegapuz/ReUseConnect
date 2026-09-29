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
  Send,
  UserCircle
} from 'lucide-react';

import {
  useSearchParams
} from 'react-router-dom';

import {
  getBuyerConversations,
  getBuyerConversation,
  sendBuyerMessage,
  markBuyerConversationRead
} from '../../services/buyer/buyerMessagesService';

import '../../styles/buyer/BuyerMessages.css';


// ============================================================
// IMAGE NORMALIZER
// ============================================================

const normalizeImageUrl = (
  imageUrl
) => {

  if (!imageUrl) {
    return '';
  }

  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('data:')
  ) {

    return imageUrl;

  }

  const cleanPath =
    imageUrl.startsWith('/')
      ? imageUrl
      : `/${imageUrl}`;

  if (
    cleanPath.startsWith(
      '/api/'
    )
  ) {

    return `http://localhost:5000${cleanPath}`;

  }

  if (
    cleanPath.startsWith(
      '/uploads/listings/'
    )
  ) {

    const filename =
      cleanPath
        .split('/')
        .pop();

    return (
      `http://localhost:5000` +
      `/api/seller/listings/image/` +
      encodeURIComponent(filename)
    );

  }

  return `http://localhost:5000${cleanPath}`;

};


// ============================================================
// BUYER MESSAGES
// ============================================================

const BuyerMessages = () => {

  const [
    searchParams
  ] = useSearchParams();


  const requestedSellerId =
    searchParams.get(
      'sellerId'
    );


  const requestedListingId =
    searchParams.get(
      'listingId'
    );


  const [
    conversations,
    setConversations
  ] = useState([]);


  const [
    selectedSellerId,
    setSelectedSellerId
  ] = useState(
    requestedSellerId
      ? Number(requestedSellerId)
      : null
  );


  const [
    selectedConversation,
    setSelectedConversation
  ] = useState(null);


  const [
    messageText,
    setMessageText
  ] = useState('');


  const [
    searchText,
    setSearchText
  ] = useState('');


  const [
    loadingConversations,
    setLoadingConversations
  ] = useState(true);


  const [
    loadingMessages,
    setLoadingMessages
  ] = useState(false);


  const [
    sending,
    setSending
  ] = useState(false);


  const [
    refreshing,
    setRefreshing
  ] = useState(false);


  const [
    error,
    setError
  ] = useState('');


  // ==========================================================
  // LOAD CONVERSATIONS
  // ==========================================================

  const loadConversations =
    useCallback(
      async (
        showRefresh = false
      ) => {

        try {

          if (showRefresh) {

            setRefreshing(
              true
            );

          } else {

            setLoadingConversations(
              true
            );

          }

          setError('');


          const response =
            await getBuyerConversations();


          if (
            !response?.success
          ) {

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


          setConversations(
            list
          );


          // If opened directly from Marketplace,
          // select that seller.

          if (
            requestedSellerId
          ) {

            const exists =
              list.some(
                (conversation) =>
                  Number(
                    conversation.seller_id
                  ) ===
                  Number(
                    requestedSellerId
                  )
              );


            if (exists) {

              setSelectedSellerId(
                Number(
                  requestedSellerId
                )
              );

            }

          } else if (
            !selectedSellerId &&
            list.length > 0
          ) {

            setSelectedSellerId(
              Number(
                list[0].seller_id
              )
            );

          }

        } catch (err) {

          console.error(
            'LOAD BUYER CONVERSATIONS ERROR:',
            err
          );


          setError(
            err?.message ||
            'Unable to load conversations.'
          );

        } finally {

          setLoadingConversations(
            false
          );

          setRefreshing(
            false
          );

        }

      },
      [
        requestedSellerId,
        selectedSellerId
      ]
    );


  // ==========================================================
  // LOAD CONVERSATION
  // ==========================================================

  const loadConversation =
    useCallback(
      async (
        sellerId
      ) => {

        if (!sellerId) {
          return;
        }


        try {

          setLoadingMessages(
            true
          );

          setError('');


          const response =
            await getBuyerConversation(
              sellerId
            );


          if (
            !response?.success
          ) {

            throw new Error(
              response?.message ||
              'Failed to load conversation.'
            );

          }


          setSelectedConversation(
            response
          );


          setConversations(
            current =>
              current.map(
                conversation => {

                  if (
                    Number(
                      conversation.seller_id
                    ) !==
                    Number(
                      sellerId
                    )
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

            await markBuyerConversationRead(
              sellerId
            );

          } catch (
            readError
          ) {

            console.warn(
              'MARK BUYER CONVERSATION READ ERROR:',
              readError
            );

          }

        } catch (err) {

          console.error(
            'LOAD BUYER CONVERSATION ERROR:',
            err
          );


          setError(
            err?.message ||
            'Unable to load conversation.'
          );

        } finally {

          setLoadingMessages(
            false
          );

        }

      },
      []
    );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(
    () => {

      loadConversations();

    },
    [
      loadConversations
    ]
  );


  // ==========================================================
  // LOAD SELECTED CONVERSATION
  // ==========================================================

  useEffect(
    () => {

      if (
        selectedSellerId
      ) {

        loadConversation(
          selectedSellerId
        );

      }

    },
    [
      selectedSellerId,
      loadConversation
    ]
  );


  // ==========================================================
  // SELECT CONVERSATION
  // ==========================================================

  const handleSelectConversation =
    (
      sellerId
    ) => {

      setSelectedSellerId(
        Number(
          sellerId
        )
      );

    };


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const handleSendMessage =
    async (
      event
    ) => {

      event.preventDefault();


      const trimmedMessage =
        messageText.trim();


      if (
        !trimmedMessage ||
        !selectedConversation?.seller
      ) {

        return;

      }


      const receiverId =
        selectedConversation
          .seller
          .user_id;


      const messages =
        selectedConversation.messages ||
        [];


      const lastMessage =
        messages[
          messages.length - 1
        ];


      let listingId =
        requestedListingId
          ? Number(
              requestedListingId
            )
          : null;


      if (
        !listingId
      ) {

        listingId =
          lastMessage?.listing_id ||
          selectedConversation
            ?.listing_id ||
          null;

      }


      try {

        setSending(
          true
        );

        setError('');


        await sendBuyerMessage({

          receiverId,

          message:
            trimmedMessage,

          listingId,

          orderId:
            lastMessage?.order_id ||
            null

        });


        setMessageText('');


        await loadConversation(
          receiverId
        );


        await loadConversations(
          true
        );

      } catch (err) {

        console.error(
          'SEND BUYER MESSAGE ERROR:',
          err
        );


        setError(
          err?.message ||
          'Unable to send message.'
        );

      } finally {

        setSending(
          false
        );

      }

    };


  // ==========================================================
  // FILTER
  // ==========================================================

  const filteredConversations =
    useMemo(
      () => {

        const query =
          searchText
            .trim()
            .toLowerCase();


        if (!query) {

          return conversations;

        }


        return conversations.filter(
          conversation => {

            const name =
              conversation.seller_name ||
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
                .includes(query)

              ||

              latestMessage
                .toLowerCase()
                .includes(query)

              ||

              listingTitle
                .toLowerCase()
                .includes(query)

            );

          }
        );

      },
      [
        conversations,
        searchText
      ]
    );


  // ==========================================================
  // HELPERS
  // ==========================================================

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

      return (
        `${first}${last}`
      ).toUpperCase();

    };


  const formatTime =
    (
      dateValue
    ) => {

      if (!dateValue) {
        return '';
      }


      const date =
        new Date(
          dateValue
        );


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
    (
      dateValue
    ) => {

      if (!dateValue) {
        return '';
      }


      const date =
        new Date(
          dateValue
        );


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return '';

      }


      const today =
        new Date();


      if (
        date.toDateString() ===
        today.toDateString()
      ) {

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


  const selectedSeller =
    selectedConversation?.seller;


  const selectedMessages =
    selectedConversation?.messages ||
    [];


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="buyer-messages">

      {error && (

        <div className="buyer-messages-error">

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


      <div className="buyer-messages-container">

        {/* ==================================================
            CONVERSATION LIST
        ================================================== */}

        <aside className="buyer-messages-sidebar">

          <div className="buyer-messages-sidebar-header">

            <div>

              <h2>
                Messages
              </h2>

              <span>
                Your conversations
              </span>

            </div>


            <button
              type="button"
              className="buyer-messages-refresh"
              onClick={() =>
                loadConversations(
                  true
                )
              }
              disabled={refreshing}
              title="Refresh"
            >

              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? 'buyer-spin'
                    : ''
                }
              />

            </button>

          </div>


          <div className="buyer-messages-search">

            <Search
              size={17}
            />

            <input
              type="text"
              value={
                searchText
              }
              onChange={
                event =>
                  setSearchText(
                    event.target.value
                  )
              }
              placeholder="Search messages..."
            />

          </div>


          <div className="buyer-conversation-list">

            {loadingConversations ? (

              <div className="buyer-messages-loading">

                <RefreshCw
                  size={22}
                  className="buyer-spin"
                />

                <span>
                  Loading conversations...
                </span>

              </div>

            ) : filteredConversations.length === 0 ? (

              <div className="buyer-no-conversations">

                <MessageCircle
                  size={34}
                />

                <strong>
                  No messages yet
                </strong>

                <span>
                  Message a seller from the Marketplace to start a conversation.
                </span>

              </div>

            ) : (

              filteredConversations.map(
                conversation => {

                  const active =
                    Number(
                      selectedSellerId
                    ) ===
                    Number(
                      conversation.seller_id
                    );


                  const sellerName =
                    conversation.seller_name ||
                    `${conversation.first_name || ''} ${
                      conversation.last_name || ''
                    }`.trim() ||
                    'Seller';


                  return (

                    <button
                      key={
                        conversation.seller_id
                      }
                      type="button"
                      className={
                        `buyer-conversation-item ${
                          active
                            ? 'active'
                            : ''
                        }`
                      }
                      onClick={() =>
                        handleSelectConversation(
                          conversation.seller_id
                        )
                      }
                    >

                      <div className="buyer-conversation-avatar">

                        {conversation.profile_image ? (

                          <img
                            src={
                              normalizeImageUrl(
                                conversation.profile_image
                              )
                            }
                            alt={
                              sellerName
                            }
                          />

                        ) : (

                          <span>
                            {
                              getInitials(
                                conversation.first_name,
                                conversation.last_name
                              )
                            }
                          </span>

                        )}

                      </div>


                      <div className="buyer-conversation-content">

                        <div className="buyer-conversation-top">

                          <strong>
                            {sellerName}
                          </strong>

                          <span>
                            {
                              formatConversationDate(
                                conversation.latest_message_at
                              )
                            }
                          </span>

                        </div>


                        {conversation.listing_title && (

                          <div className="buyer-conversation-listing">

                            {conversation.listing_title}

                          </div>

                        )}


                        <div className="buyer-conversation-bottom">

                          <span>
                            {
                              conversation.latest_message ||
                              'No message'
                            }
                          </span>


                          {Number(
                            conversation.unread_count
                          ) > 0 && (

                            <b>
                              {
                                conversation.unread_count
                              }
                            </b>

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


        {/* ==================================================
            MESSAGE AREA
        ================================================== */}

        <section className="buyer-message-panel">

          {!selectedSellerId ? (

            <div className="buyer-message-empty">

              <div className="buyer-message-empty-icon">

                <MessageCircle
                  size={36}
                />

              </div>

              <h2>
                Your Messages
              </h2>

              <p>
                Select a conversation to view your messages.
              </p>

            </div>

          ) : loadingMessages ? (

            <div className="buyer-message-empty">

              <RefreshCw
                size={28}
                className="buyer-spin"
              />

              <p>
                Loading conversation...
              </p>

            </div>

          ) : selectedConversation ? (

            <>

              {/* ==================================================
                  HEADER
              ================================================== */}

              <header className="buyer-message-header">

                <div className="buyer-message-user">

                  <div className="buyer-message-avatar">

                    {selectedSeller?.profile_image ? (

                      <img
                        src={
                          normalizeImageUrl(
                            selectedSeller.profile_image
                          )
                        }
                        alt={
                          selectedSeller.full_name ||
                          'Seller'
                        }
                      />

                    ) : (

                      <span>
                        {
                          getInitials(
                            selectedSeller?.first_name,
                            selectedSeller?.last_name
                          )
                        }
                      </span>

                    )}

                  </div>


                  <div>

                    <strong>
                      {
                        selectedSeller?.full_name ||
                        `${selectedSeller?.first_name || ''} ${
                          selectedSeller?.last_name || ''
                        }`.trim() ||
                        'Seller'
                      }
                    </strong>

                    <span>
                      Seller
                    </span>

                  </div>

                </div>

              </header>


              {/* ==================================================
                  MESSAGES
              ================================================== */}

              <div className="buyer-message-list">

                {selectedMessages.length === 0 ? (

                  <div className="buyer-no-messages">

                    <MessageCircle
                      size={34}
                    />

                    <p>
                      No messages yet.
                    </p>

                    <span>
                      Send a message to start the conversation.
                    </span>

                  </div>

                ) : (

                  selectedMessages.map(
                    message => {

                      const isMine =
                        Boolean(
                          message.is_mine
                        );


                      return (

                        <div
                          key={
                            message.message_id
                          }
                          className={
                            `buyer-message-row ${
                              isMine
                                ? 'mine'
                                : 'received'
                            }`
                          }
                        >

                          <div
                            className={
                              `buyer-message-bubble ${
                                isMine
                                  ? 'mine'
                                  : 'received'
                              }`
                            }
                          >

                            {message.listing_title && (

                              <div className="buyer-message-listing-card">

                                {message.listing_image ? (

                                  <img
                                    src={
                                      normalizeImageUrl(
                                        message.listing_image
                                      )
                                    }
                                    alt={
                                      message.listing_title
                                    }
                                  />

                                ) : (

                                  <div className="buyer-message-listing-placeholder">

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


                            <div className="buyer-message-meta">

                              <span>
                                {
                                  formatTime(
                                    message.created_at
                                  )
                                }
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


              {/* ==================================================
                  INPUT
              ================================================== */}

              <form
                className="buyer-message-input-area"
                onSubmit={
                  handleSendMessage
                }
              >

                <div className="buyer-message-input-wrapper">

                  <textarea
                    value={
                      messageText
                    }
                    onChange={
                      event =>
                        setMessageText(
                          event.target.value
                        )
                    }
                    placeholder="Type your message..."
                    rows={1}
                    disabled={
                      sending
                    }
                    onKeyDown={
                      event => {

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

                      }
                    }
                  />


                  <button
                    type="submit"
                    className="buyer-send-message-button"
                    disabled={
                      sending ||
                      !messageText.trim()
                    }
                    title="Send message"
                  >

                    {sending ? (

                      <RefreshCw
                        size={19}
                        className="buyer-spin"
                      />

                    ) : (

                      <Send
                        size={19}
                      />

                    )}

                  </button>

                </div>


                <div className="buyer-message-input-hint">

                  Press Enter to send · Shift + Enter for a new line

                </div>

              </form>

            </>

          ) : (

            <div className="buyer-message-empty">

              <UserCircle
                size={34}
              />

              <p>
                Unable to open this conversation.
              </p>

            </div>

          )}

        </section>

      </div>

    </div>

  );

};


export default BuyerMessages;