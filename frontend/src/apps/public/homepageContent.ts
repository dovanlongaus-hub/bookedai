import { brandName, brandPositioning } from '../../components/landing/data';

export type HomepageLocale = 'en' | 'vi';

export type HomepageNavLink = {
  label: string;
  href: string;
};

export type HomepageMenuSection = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
};

export type HomepageSuggestion = {
  label: string;
  query: string;
};

type HomepageSuggestionPool = {
  day: number;
  suggestions: HomepageSuggestion[];
};

export type HomepageContent = {
  navLinks: HomepageNavLink[];
  searchSuggestions: HomepageSuggestion[];
  menuSections: HomepageMenuSection[];
  pitchDeckSections: HomepageMenuSection[];
  ui: {
    languageLabel: string;
    openMenu: string;
    closeMenu: string;
    searchPlaceholder: string;
    searchButton: string;
    revenueTagline: string;
    resultsTitle: string;
    resultsEmptyTitle: string;
    resultsEmptyBody: string;
    resultsLoadingTitle: string;
    resultsLoadingBody: string;
    resultsQueryLabel: string;
    shortlistLabel: string;
    shortlistBody: string;
    bookingPanelTitle: string;
    bookingPanelEmpty: string;
    bookingPanelSelected: string;
    bookingPanelHelper: string;
    bookingButton: string;
    bookingSubmitting: string;
    bookingSuccessTitle: string;
    bookingSuccessBody: string;
    contactTeam: string;
    watchDemo: string;
    pitchDeck: string;
    roadmap: string;
    menuTitle: string;
    menuBody: string;
    statusLive: string;
    nameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    dateTimeLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    summaryTitle: string;
    noMatchTitle: string;
    noMatchBody: string;
    geoHint: string;
    thankYouTitle: string;
    thankYouBody: string;
    requestedSlotLabel: string;
    followUpLabel: string;
    paymentActionLabel: string;
    emailBookingLabel: string;
    calendarActionLabel: string;
    viewCalendarLabel: string;
    qrLabel: string;
    returnHomeLabel: string;
  };
};

export const pitchDeckHref = 'https://pitch.bookedai.au/';
export const roadmapHref = '/roadmap';
export const videoDemoHref = '/video-demo.html';

export const languageOptions: Array<{ value: HomepageLocale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
];

function normalizeDayIndex(dayIndex?: number) {
  if (typeof dayIndex !== 'number' || Number.isNaN(dayIndex)) {
    return new Date().getDay();
  }

  const normalized = Math.floor(dayIndex) % 7;
  return normalized < 0 ? normalized + 7 : normalized;
}

function getDailySuggestions(
  pools: HomepageSuggestionPool[],
  fallback: HomepageSuggestion[],
  dayIndex?: number,
) {
  const activeDay = normalizeDayIndex(dayIndex);
  return pools.find((pool) => pool.day === activeDay)?.suggestions ?? fallback;
}

export function getHomepageContent(locale: HomepageLocale, dayIndex?: number): HomepageContent {
  if (locale === 'vi') {
    const dailySuggestionPools: HomepageSuggestionPool[] = [
      {
        day: 0,
        suggestions: [
          { label: 'Kids sport', query: 'Tìm lớp bóng đá cho trẻ em gần Melbourne cho cuối tuần này.' },
          { label: 'Tutor', query: 'Đặt gia sư toán Year 8 cho Chủ nhật này.' },
          { label: 'Vet care', query: 'Tìm phòng khám thú y mở Chủ nhật gần tôi.' },
          { label: 'Dental', query: 'Tìm lịch nha khoa cuối tuần gần Parramatta.' },
          { label: 'Hair salon', query: 'Tôi cần đặt lịch cắt tóc nam ở Sydney vào chiều nay.' },
        ],
      },
      {
        day: 1,
        suggestions: [
          { label: 'Healthcare', query: 'Đặt lịch bulk-billing GP gần Sydney CBD vào sáng nay.' },
          { label: 'Physio', query: 'Tìm cho tôi lịch physio gần Parramatta trong tuần này.' },
          { label: 'Housing', query: 'Tôi cần thợ sửa điều hòa cho căn hộ ở Brisbane vào chiều nay.' },
          { label: 'Cleaning', query: 'Đặt dịch vụ dọn nhà đầu tuần cho townhouse ở Sydney.' },
          { label: 'NDIS', query: 'Tôi cần dịch vụ support worker NDIS tại nhà ở Western Sydney.' },
        ],
      },
      {
        day: 2,
        suggestions: [
          { label: 'Childcare', query: 'Tìm daycare hoặc after-school care gần Canberra còn chỗ trong tuần này.' },
          { label: 'Dental', query: 'Tìm lịch nha khoa gần Parramatta cho kiểm tra răng trong tuần này.' },
          { label: 'Healthcare', query: 'Đặt lịch telehealth GP cho chiều nay.' },
          { label: 'Housing', query: 'Tôi cần thợ điện sửa ổ cắm ở căn hộ tại Melbourne hôm nay.' },
          { label: 'Tutor', query: 'Đặt gia sư tiếng Anh cho học sinh tiểu học vào tối nay.' },
        ],
      },
      {
        day: 3,
        suggestions: [
          { label: 'Physio', query: 'Tìm lịch physio cho đau lưng gần Sydney Olympic Park.' },
          { label: 'Hair salon', query: 'Đặt lịch cắt tóc và fade gần Sydney CBD vào tối nay.' },
          { label: 'Cleaning', query: 'Tôi cần dịch vụ end-of-lease cleaning cho căn hộ 2 phòng ở Sydney.' },
          { label: 'Vet care', query: 'Tìm lịch tiêm vaccine cho chó trong chiều nay.' },
          { label: 'NDIS', query: 'Tìm dịch vụ community access NDIS cho tuần này.' },
        ],
      },
      {
        day: 4,
        suggestions: [
          { label: 'Housing', query: 'Tôi cần thợ sửa ống nước khẩn cấp cho nhà bếp ở Brisbane tối nay.' },
          { label: 'Healthcare', query: 'Đặt lịch bulk-billing GP gần Sydney CBD vào sáng mai.' },
          { label: 'Kids sport', query: 'Tìm lớp bơi cho trẻ em gần Melbourne cho cuối tuần này.' },
          { label: 'Childcare', query: 'Tìm after-school care gần Canberra cho tuần tới.' },
          { label: 'Tutor', query: 'Đặt gia sư toán cho cuối tuần này.' },
        ],
      },
      {
        day: 5,
        suggestions: [
          { label: 'Hair salon', query: 'Tôi cần đặt lịch cắt tóc nam ở Sydney vào chiều mai.' },
          { label: 'Kids sport', query: 'Tìm lớp tennis cho trẻ em gần Melbourne cho thứ Bảy.' },
          { label: 'Dental', query: 'Đặt lịch nha khoa sáng thứ Bảy gần Parramatta.' },
          { label: 'Cleaning', query: 'Đặt dịch vụ dọn nhà trước cuối tuần ở Sydney.' },
          { label: 'Vet care', query: 'Tìm phòng khám thú y gần tôi cho lịch khám thứ Bảy.' },
        ],
      },
      {
        day: 6,
        suggestions: [
          { label: 'Healthcare', query: 'Tìm phòng khám GP mở thứ Bảy gần Sydney CBD.' },
          { label: 'Physio', query: 'Đặt lịch physio sáng thứ Bảy gần Parramatta.' },
          { label: 'Housing', query: 'Tôi cần thợ sửa máy nước nóng cho căn hộ ở Brisbane cuối tuần này.' },
          { label: 'Childcare', query: 'Tìm dịch vụ babysitter tại nhà tối thứ Bảy ở Melbourne.' },
          { label: 'Tutor', query: 'Đặt gia sư ôn bài cho kỳ thi vào Chủ nhật.' },
        ],
      },
    ];

    const fallbackSuggestions: HomepageSuggestion[] = [
      { label: 'Hair salon', query: 'Tôi cần đặt lịch cắt tóc nam ở Sydney vào chiều mai.' },
      { label: 'Kids sport', query: 'Tìm lớp bóng đá cho trẻ em gần Melbourne cho cuối tuần này.' },
      { label: 'Housing', query: 'Tôi cần thợ sửa điều hòa cho căn hộ ở Brisbane vào ngày mai.' },
      { label: 'Healthcare', query: 'Đặt lịch bulk-billing GP gần Sydney CBD vào sáng mai.' },
      { label: 'Dental', query: 'Tìm lịch nha khoa gần Parramatta cho kiểm tra răng trong tuần này.' },
    ];

    return {
      navLinks: [
        { label: 'pitch.bookedai.au', href: pitchDeckHref },
        { label: 'Roadmap', href: roadmapHref },
        { label: 'Video Demo', href: videoDemoHref },
      ],
      searchSuggestions: getDailySuggestions(dailySuggestionPools, fallbackSuggestions, dayIndex),
      menuSections: [
        {
          id: 'platform',
          eyebrow: 'Chat Revenue Platform',
          title: 'Homepage hiện là landing page chính cho conversational revenue flow',
          body: 'BookedAI.au không chỉ là search runtime. Trang chủ giờ giải thích luôn cách hội thoại, qualification, booking path và revenue outcome được nối thành một hệ thống.',
          points: [
            'Hero cho thấy conversational preview thay vì chỉ một ô search.',
            'Capability cards, integrations và CTA đều bám theo cùng một thông điệp doanh thu.',
            'Pitch Deck vẫn dùng cho narrative sâu hơn, nhưng homepage đã là entry surface hoàn chỉnh.',
          ],
        },
        {
          id: 'revenue',
          eyebrow: 'Revenue Engine',
          title: 'BookedAI là cỗ máy kiếm tiền cho service SMEs',
          body: brandPositioning,
          points: [
            'Search intent đi vào từ một ô truy vấn duy nhất.',
            'Kết quả được xếp hạng và đưa thẳng sang hành động booking.',
            'Thanh toán, xác nhận và handoff được nối liên tục để tránh mất lead nóng.',
          ],
        },
        {
          id: 'channels',
          eyebrow: 'Conversation Channels',
          title: 'BookedAI thu và xử lý nhiều loại hội thoại trong một flow',
          body: 'Website chat, missed calls, email enquiries và follow-up đều được gom về cùng một hệ thống để giảm thất thoát lead nóng.',
          points: [
            'Một luồng xử lý nhất quán cho chat, calls, email và booking requests.',
            'Qualification và next step được hiển thị rõ thay vì trả lời chung chung.',
            'Kết quả cuối cùng luôn gắn với booking, callback, quote hoặc revenue recovery.',
          ],
        },
      ],
      pitchDeckSections: [
        {
          id: 'story',
          eyebrow: 'BookedAI Story',
          title: 'Từ enquiry rời rạc thành booking có doanh thu',
          body: 'BookedAI được xây để biến nhu cầu rời rạc của local service SMEs thành booking path rõ ràng, thay vì để đội ngũ xử lý thủ công từng lead.',
          points: [
            'Search-first acquisition surface.',
            'AI-guided shortlist và booking path.',
            'Payment, confirmation, và operator handoff cùng một luồng.',
          ],
        },
        {
          id: 'engine',
          eyebrow: 'Revenue Engine',
          title: 'BookedAI không phải chatbot, cũng không chỉ là widget booking',
          body: 'Nó là bề mặt doanh thu: nắm bắt demand, hiểu intent, xếp hạng best-fit match, rồi kéo user đi hết đến booking.',
          points: [
            'Giảm friction ở màn đầu.',
            'Tăng tỷ lệ chuyển đổi từ search sang booked.',
            'Tạo visibility tốt hơn cho operator về demand thật.',
          ],
        },
        {
          id: 'fit',
          eyebrow: 'Service SME Fit',
          title: 'Phù hợp cho salon, clinic, tutor, trades và local services',
          body: 'Bất kỳ business nào cần chuyển một yêu cầu tự nhiên thành action rõ ràng đều phù hợp với mô hình này.',
          points: [
            'Salon và clinic cần qualification nhanh.',
            'Trades cần triage urgency và routing.',
            'Tutor và local classes cần matching đúng dịch vụ trước checkout.',
          ],
        },
      ],
      ui: {
        languageLabel: 'Ngôn ngữ',
        openMenu: 'Mở Menu',
        closeMenu: 'Đóng Menu',
        searchPlaceholder: 'Bạn muốn đặt dịch vụ nào hôm nay?',
        searchButton: 'Try Now',
        revenueTagline: 'AI revenue engine for service businesses',
        resultsTitle: 'Kết quả tìm kiếm BookedAI',
        resultsEmptyTitle: 'Một ô search. Một hành động rõ ràng.',
        resultsEmptyBody: 'Nhập dịch vụ bạn cần và BookedAI sẽ dựng shortlist, booking path và confirmation ngay trên trang này.',
        resultsLoadingTitle: 'Đang tìm kết quả phù hợp nhất',
        resultsLoadingBody: 'BookedAI đang đọc intent dịch vụ, locality và booking path để chuẩn bị shortlist.',
        resultsQueryLabel: 'Truy vấn hiện tại',
        shortlistLabel: 'Shortlist',
        shortlistBody: 'Kết quả được hiển thị như một search surface độc lập, không phải popup assistant.',
        bookingPanelTitle: 'Booking',
        bookingPanelEmpty: 'Chọn một kết quả để tiếp tục booking.',
        bookingPanelSelected: 'Đã chọn',
        bookingPanelHelper: 'Luồng booking dùng cùng logic API với assistant cũ nhưng giao diện này là homepage search runtime mới hoàn toàn.',
        bookingButton: 'Tiếp tục booking',
        bookingSubmitting: 'Đang tạo booking...',
        bookingSuccessTitle: 'Booking đã sẵn sàng',
        bookingSuccessBody: 'Payment, confirmation và follow-up đã được chuẩn bị.',
        contactTeam: 'Liên hệ team',
        watchDemo: 'Xem demo',
        pitchDeck: 'pitch.bookedai.au',
        roadmap: 'Roadmap',
        menuTitle: 'Navigation',
        menuBody: 'Dùng menu này để điều hướng giữa live search, roadmap, demo và các lớp giải thích sâu hơn của BookedAI.au.',
        statusLive: 'Live search',
        nameLabel: 'Tên',
        emailLabel: 'Email',
        phoneLabel: 'Số điện thoại',
        dateTimeLabel: 'Thời gian mong muốn',
        notesLabel: 'Ghi chú booking',
        notesPlaceholder: 'Bổ sung yêu cầu, khung giờ hoặc bối cảnh để operator chuẩn bị tốt hơn.',
        summaryTitle: 'Tóm tắt',
        noMatchTitle: 'Chưa có match đủ mạnh',
        noMatchBody: 'BookedAI sẽ ưu tiên độ chính xác hơn là gợi ý sai domain.',
        geoHint: 'Nếu cần độ chính xác địa phương cao hơn, hãy thêm suburb hoặc khu vực mong muốn.',
        thankYouTitle: 'Cảm ơn bạn',
        thankYouBody: 'Booking đã được ghi nhận. QR, lịch và email follow-up đã sẵn sàng ngay bên dưới.',
        requestedSlotLabel: 'Khung giờ đã chọn',
        followUpLabel: 'Follow-up',
        paymentActionLabel: 'Tiếp tục thanh toán',
        emailBookingLabel: 'Gửi email booking',
        calendarActionLabel: 'Thêm vào lịch',
        viewCalendarLabel: 'Xem sự kiện lịch',
        qrLabel: 'Mã QR booking',
        returnHomeLabel: 'Về lại homepage',
      },
    };
  }

  const dailySuggestionPools: HomepageSuggestionPool[] = [
    {
      day: 0,
      suggestions: [
        { label: 'Kids sport', query: 'Find a kids football class near Melbourne for this weekend.' },
        { label: 'Tutor', query: 'Book a Year 8 maths tutor for Sunday.' },
        { label: 'Vet care', query: 'Find a Sunday vet appointment near me.' },
        { label: 'Dental', query: 'Book a weekend dental check-up near Parramatta.' },
        { label: 'Hair salon', query: 'I need a men’s haircut in Sydney this afternoon.' },
      ],
    },
    {
      day: 1,
      suggestions: [
        { label: 'Healthcare', query: 'Book a bulk-billing GP near Sydney CBD this morning.' },
        { label: 'Physio', query: 'Find me a physio appointment near Parramatta this week.' },
        { label: 'Housing', query: 'I need an aircon repair for my Brisbane apartment this afternoon.' },
        { label: 'Cleaning', query: 'Book a start-of-week house cleaning for a Sydney townhouse.' },
        { label: 'NDIS', query: 'I need an in-home NDIS support worker in Western Sydney.' },
      ],
    },
    {
      day: 2,
      suggestions: [
        { label: 'Childcare', query: 'Find a daycare or after-school care spot near Canberra this week.' },
        { label: 'Dental', query: 'Find a dental check-up near Parramatta this week.' },
        { label: 'Healthcare', query: 'Book a telehealth GP appointment for this afternoon.' },
        { label: 'Housing', query: 'I need an electrician to fix power outlets in my Melbourne apartment today.' },
        { label: 'Tutor', query: 'Book an English tutor for a primary school student tonight.' },
      ],
    },
    {
      day: 3,
      suggestions: [
        { label: 'Physio', query: 'Find a back pain physio near Sydney Olympic Park.' },
        { label: 'Hair salon', query: 'Book a haircut and fade near Sydney CBD tonight.' },
        { label: 'Cleaning', query: 'Book an end-of-lease cleaning service for a 2-bedroom apartment in Sydney.' },
        { label: 'Vet care', query: 'Find a dog vaccination appointment for this afternoon.' },
        { label: 'NDIS', query: 'Find an NDIS community access support service for this week.' },
      ],
    },
    {
      day: 4,
      suggestions: [
        { label: 'Housing', query: 'I need an emergency plumber for my Brisbane kitchen tonight.' },
        { label: 'Healthcare', query: 'Book a bulk-billing GP near Sydney CBD tomorrow morning.' },
        { label: 'Kids sport', query: 'Find a kids swimming class near Melbourne for this weekend.' },
        { label: 'Childcare', query: 'Find after-school care near Canberra for next week.' },
        { label: 'Tutor', query: 'Book a maths tutor for this weekend.' },
      ],
    },
    {
      day: 5,
      suggestions: [
        { label: 'Hair salon', query: 'I need a men’s haircut in Sydney tomorrow afternoon.' },
        { label: 'Kids sport', query: 'Find a kids tennis class near Melbourne for Saturday.' },
        { label: 'Dental', query: 'Book a Saturday morning dental check-up near Parramatta.' },
        { label: 'Cleaning', query: 'Book a pre-weekend house cleaning in Sydney.' },
        { label: 'Vet care', query: 'Find a Saturday vet appointment near me.' },
      ],
    },
    {
      day: 6,
      suggestions: [
        { label: 'Healthcare', query: 'Find a Saturday GP clinic near Sydney CBD.' },
        { label: 'Physio', query: 'Book a Saturday morning physio appointment near Parramatta.' },
        { label: 'Housing', query: 'I need a hot water repair for my Brisbane apartment this weekend.' },
        { label: 'Childcare', query: 'Find an in-home babysitter for Saturday night in Melbourne.' },
        { label: 'Tutor', query: 'Book an exam prep tutor for Sunday.' },
      ],
    },
  ];

  const fallbackSuggestions: HomepageSuggestion[] = [
    { label: 'Hair salon', query: 'I need a men’s haircut in Sydney tomorrow afternoon.' },
    { label: 'Kids sport', query: 'Find a kids football class near Melbourne for this weekend.' },
    { label: 'Housing', query: 'I need an aircon repair for my Brisbane apartment tomorrow.' },
    { label: 'Healthcare', query: 'Book a bulk-billing GP near Sydney CBD tomorrow morning.' },
    { label: 'Dental', query: 'Find a dental check-up near Parramatta this week.' },
  ];

  return {
    navLinks: [
      { label: 'pitch.bookedai.au', href: pitchDeckHref },
      { label: 'Roadmap', href: roadmapHref },
      { label: 'Video Demo', href: videoDemoHref },
    ],
    searchSuggestions: getDailySuggestions(dailySuggestionPools, fallbackSuggestions, dayIndex),
    menuSections: [
      {
        id: 'platform',
        eyebrow: 'Chat Revenue Platform',
        title: 'The homepage is now the primary conversational landing surface',
        body: 'BookedAI.au no longer needs to behave like a stripped-down search runtime. The homepage now carries the product story, conversational proof, and commercial CTA in one place.',
        points: [
          'The hero shows a conversational preview instead of only a search shell.',
          'Capability, integration, and outcome sections all point back to revenue.',
          'Pitch Deck still exists for deeper narrative, but the homepage is now a complete entry surface.',
        ],
      },
      {
        id: 'revenue',
        eyebrow: 'Revenue Engine',
        title: 'BookedAI is a revenue engine for service SMEs',
        body: brandPositioning,
        points: [
          'Search intent enters through a single query box.',
          'Results are ranked and pushed directly toward booking action.',
          'Payment, confirmation, and handoff stay connected so warm leads are not lost.',
        ],
      },
      {
        id: 'channels',
        eyebrow: 'Conversation Channels',
        title: 'BookedAI handles multiple conversation types in one commercial flow',
        body: 'Website chat, missed calls, email enquiries, and follow-up all move through the same qualification and booking logic so fewer warm leads leak out of the system.',
        points: [
          'One handling pattern for chat, calls, email, and booking requests.',
          'Qualification and next step are made explicit instead of vague.',
          'The visible outcome is always tied to booking, callback, quote, or recovery.',
        ],
      },
    ],
    pitchDeckSections: [
      {
        id: 'story',
        eyebrow: 'BookedAI Story',
        title: 'From scattered enquiries to revenue-ready bookings',
        body: 'BookedAI is built to turn messy demand from local service SMEs into a clear booking path instead of forcing teams to manually triage every lead.',
        points: [
          'A search-first acquisition surface.',
          'An AI-guided shortlist and booking path.',
          'Payment, confirmation, and operator handoff in one continuous flow.',
        ],
      },
      {
        id: 'engine',
        eyebrow: 'Revenue Engine',
        title: 'BookedAI is not just a chatbot or booking widget',
        body: 'It is a revenue surface: capture demand, understand intent, rank the best-fit option, and keep the user moving until they are booked.',
        points: [
          'Lower friction on the first screen.',
          'Higher conversion from search to booked.',
          'Clearer demand visibility for the operator team.',
        ],
      },
      {
        id: 'fit',
        eyebrow: 'Service SME Fit',
        title: 'Built for salons, clinics, tutors, trades, and local service teams',
        body: 'Any business that needs to turn a natural-language request into a confident next step fits this model.',
        points: [
          'Salons and clinics need faster qualification.',
          'Trades need urgency triage and routing.',
          'Tutors and local classes need correct matching before checkout.',
        ],
      },
    ],
    ui: {
      languageLabel: 'Language',
      openMenu: 'Open Menu',
      closeMenu: 'Close Menu',
      searchPlaceholder: 'What service do you want to book today?',
      searchButton: 'Try Now',
      revenueTagline: 'AI revenue engine for service businesses',
      resultsTitle: 'BookedAI search results',
      resultsEmptyTitle: 'One search box. One clear action.',
      resultsEmptyBody: 'Type the service you need and BookedAI will build the shortlist, booking path, and confirmation flow directly on this page.',
      resultsLoadingTitle: 'BookedAI is finding the best option for your request.',
      resultsLoadingBody: 'BookedAI is checking tenant matches first, then expanding carefully when a stronger public web option is needed.',
      resultsQueryLabel: 'Current query',
      shortlistLabel: 'Shortlist',
      shortlistBody: 'Ranked service matches appear here with the fastest next booking step.',
      bookingPanelTitle: 'Booking',
      bookingPanelEmpty: 'Select a result to continue into booking.',
      bookingPanelSelected: 'Selected',
      bookingPanelHelper: 'Choose the best match, confirm your preferred time, and keep the booking moving.',
      bookingButton: 'Continue booking',
      bookingSubmitting: 'Creating booking...',
      bookingSuccessTitle: 'Booking is ready',
      bookingSuccessBody: 'Payment, confirmation, and follow-up have already been prepared.',
      contactTeam: 'Contact team',
      watchDemo: 'Watch demo',
      pitchDeck: 'pitch.bookedai.au',
      roadmap: 'Roadmap',
      menuTitle: 'Navigation',
      menuBody: 'Use this menu to move between live search, roadmap, demo, and deeper BookedAI.au context without losing the conversion-first landing flow.',
      statusLive: 'Live search',
      nameLabel: 'Name',
      emailLabel: 'Email',
      phoneLabel: 'Phone',
      dateTimeLabel: 'Preferred time',
      notesLabel: 'Booking notes',
      notesPlaceholder: 'Add context, timing, or service details so the operator can prepare the right next step.',
      summaryTitle: 'Summary',
      noMatchTitle: 'No strong match yet',
      noMatchBody: 'BookedAI will prefer accuracy over showing a wrong-domain recommendation.',
      geoHint: 'For tighter local matching, include the suburb or area you prefer.',
      thankYouTitle: 'Thank you',
      thankYouBody: 'Your booking is now in motion. QR, calendar, and email handoff are ready below.',
      requestedSlotLabel: 'Requested slot',
      followUpLabel: 'Follow-up',
      paymentActionLabel: 'Continue to payment',
      emailBookingLabel: 'Email booking details',
      calendarActionLabel: 'Add to calendar',
      viewCalendarLabel: 'View calendar event',
      qrLabel: 'Booking QR',
      returnHomeLabel: 'Return to homepage',
    },
  };
}
