import styles from './cookies.module.css';
import Link from 'next/link';

export const metadata = {
  title: 'Політика Cookie-файлів - Dekop',
  description: 'Інформація про використання cookie-файлів на сайті Dekop Furniture Enterprise',
};

export default function CookiePolicyPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>Політика використання Cookie-файлів</h1>

        <p className={styles.intro}>
          Ця сторінка пояснює, як Dekop Furniture Enterprise використовує cookie-файли на нашому веб-сайті та як ви можете керувати ними.
        </p>

        <section id="what-are-cookies">
          <h2>Що таке Cookie-файли?</h2>
          <p>
            Cookie-файли – це невеликі текстові файли, які зберігаються на вашому комп'ютері або мобільному пристрої, коли ви відвідуєте веб-сайт. Вони широко використовуються для того, щоб веб-сайти працювали ефективніше, а також для надання інформації власникам сайту.
          </p>
        </section>

        <section id="why-cookies">
          <h2>Навіщо ми використовуємо Cookie-файли?</h2>
          <p>
            При відвідуванні сайту Dekop ми використовуємо cookie-файли для:
          </p>
          <ul>
            <li><strong>Забезпечення роботи сайту:</strong> Cookie-файли дозволяють нам запам'ятовувати ваші налаштування та забезпечувати безперебійну роботу функцій сайту.</li>
            <li><strong>Зберігання вашого кошика:</strong> Ми зберігаємо товари у вашому кошику між сесіями перегляду.</li>
            <li><strong>Персоналізації досвіду:</strong> Ми адаптуємо контент відповідно до ваших уподобань.</li>
            <li><strong>Аналітики:</strong> Ми відстежуємо, як відвідувачі використовують наш сайт, щоб покращити його.</li>
            <li><strong>Безпеки:</strong> Cookie-файли допомагають захистити ваш обліковий запис і запобігти шахрайству.</li>
          </ul>
        </section>

        <section id="cookie-types">
          <h2>Типи Cookie-файлів, які ми використовуємо</h2>

          <div className={styles.cookieType}>
            <h3>1. Необхідні Cookie-файли (Обов'язкові)</h3>
            <p>
              Ці cookie-файли є необхідними для роботи сайту і не можуть бути вимкнені. Вони зазвичай встановлюються у відповідь на ваші дії, такі як вхід в систему, додавання товарів до кошика або налаштування конфіденційності.
            </p>
            <div className={styles.examples}>
              <strong>Приклади:</strong>
              <ul>
                <li><code>cart_session</code> - Зберігання вашого кошика покупок (30 днів)</li>
                <li><code>session_token</code> - Підтримка вашої сесії входу (90 днів)</li>
                <li><code>csrf_token</code> - Захист від атак (сесія)</li>
                <li><code>cookie_consent</code> - Запам'ятовування вашого вибору щодо cookie (1 рік)</li>
              </ul>
            </div>
          </div>

          <div className={styles.cookieType}>
            <h3>2. Аналітичні Cookie-файли (Опціональні)</h3>
            <p>
              Ці cookie-файли допомагають нам зрозуміти, як відвідувачі взаємодіють з нашим сайтом, збираючи та передаючи інформацію анонімно. Це допомагає нам покращувати роботу сайту.
            </p>
            <div className={styles.examples}>
              <strong>Приклади:</strong>
              <ul>
                <li><code>_ga</code> - Google Analytics, основний cookie (2 роки)</li>
                <li><code>_gid</code> - Google Analytics, ідентифікатор (24 години)</li>
                <li><code>_gat</code> - Google Analytics, обмеження запитів (1 хвилина)</li>
              </ul>
            </div>
            <p className={styles.note}>
              <strong>Примітка:</strong> Ці cookie-файли встановлюються лише за вашою згодою.
            </p>
          </div>

          <div className={styles.cookieType}>
            <h3>3. Маркетингові Cookie-файли (Опціональні)</h3>
            <p>
              Ці cookie-файли використовуються для відстеження відвідувачів на різних веб-сайтах. Вони призначені для показу реклами, яка є релевантною та цікавою для окремого користувача.
            </p>
            <div className={styles.examples}>
              <strong>Приклади:</strong>
              <ul>
                <li><code>fbp</code> - Facebook Pixel (90 днів)</li>
                <li><code>_gcl_*</code> - Google Ads (90 днів)</li>
              </ul>
            </div>
            <p className={styles.note}>
              <strong>Примітка:</strong> Ці cookie-файли встановлюються лише за вашою згодою.
            </p>
          </div>
        </section>

        <section id="session-vs-persistent">
          <h2>Сесійні vs Постійні Cookie-файли</h2>

          <div className={styles.comparison}>
            <div className={styles.comparisonItem}>
              <h3>Сесійні Cookie-файли</h3>
              <p>
                Сесійні cookie-файли є тимчасовими і автоматично видаляються, коли ви закриваєте браузер. Вони дозволяють нам зв'язувати ваші дії під час конкретного сеансу перегляду.
              </p>
            </div>

            <div className={styles.comparisonItem}>
              <h3>Постійні Cookie-файли</h3>
              <p>
                Постійні cookie-файли залишаються на вашому пристрої протягом певного періоду часу або до тих пір, поки ви їх не видалите вручну. Вони допомагають нам розпізнавати вас при повторних відвідуваннях.
              </p>
            </div>
          </div>
        </section>

        <section id="first-vs-third-party">
          <h2>Cookie-файли першої особи vs третіх осіб</h2>

          <div className={styles.comparison}>
            <div className={styles.comparisonItem}>
              <h3>Cookie-файли першої особи</h3>
              <p>
                Встановлюються безпосередньо нашим веб-сайтом (dekop.ua). Вони необхідні для базового функціонування сайту.
              </p>
            </div>

            <div className={styles.comparisonItem}>
              <h3>Cookie-файли третіх осіб</h3>
              <p>
                Встановлюються іншими організаціями через наш веб-сайт (наприклад, Google Analytics). Ми використовуємо їх для аналітики та покращення нашого сервісу.
              </p>
            </div>
          </div>
        </section>

        <section id="google-analytics">
          <h2>Google Analytics</h2>
          <p>
            Ми використовуємо Google Analytics для аналізу використання нашого веб-сайту. Google Analytics збирає інформацію анонімно за допомогою cookie-файлів про:
          </p>
          <ul>
            <li>Кількість відвідувачів нашого сайту</li>
            <li>Звідки відвідувачі прийшли на сайт</li>
            <li>Які сторінки вони відвідали</li>
            <li>Як довго вони перебували на сайті</li>
          </ul>
          <p>
            Ця інформація допомагає нам зрозуміти, як покращити наш веб-сайт та зробити його більш зручним для вас.
          </p>
          <p>
            Більше інформації про Google Analytics: <a href="https://www.google.com/analytics" target="_blank" rel="noopener noreferrer">https://www.google.com/analytics</a>
          </p>
        </section>

        <section id="manage-cookies">
          <h2>Як керувати Cookie-файлами</h2>

          <h3>На нашому сайті</h3>
          <p>
            Ви можете в будь-який час змінити свої налаштування cookie, використовуючи:
          </p>
          <ul>
            <li>Банер cookie, який з'являється при першому відвідуванні сайту</li>
            <li>Кнопку "Налаштування cookie" внизу сторінки (якщо доступна)</li>
          </ul>

          <h3>У вашому браузері</h3>
          <p>
            Більшість веб-браузерів дозволяють контролювати cookie-файли через налаштування браузера. Щоб дізнатися більше про cookie-файли, включаючи як переглядати встановлені cookie-файли та як ними керувати і видаляти їх, відвідайте:
          </p>
          <ul>
            <li><strong>Chrome:</strong> Налаштування → Конфіденційність та безпека → Cookie-файли</li>
            <li><strong>Firefox:</strong> Налаштування → Приватність і захист → Cookie-файли</li>
            <li><strong>Safari:</strong> Налаштування → Конфіденційність → Керування даними веб-сайтів</li>
            <li><strong>Edge:</strong> Налаштування → Cookie-файли та дозволи сайтів</li>
          </ul>

          <div className={styles.warning}>
            <strong>⚠️ Важливо:</strong> Якщо ви вимкнете необхідні cookie-файли, деякі функції нашого сайту можуть не працювати належним чином. Наприклад, ви не зможете зберегти товари у кошику або увійти в свій обліковий запис.
          </div>
        </section>

        <section id="updates">
          <h2>Оновлення цієї Політики</h2>
          <p>
            Ми можемо час від часу оновлювати цю Політику Cookie-файлів, щоб відобразити зміни в технологіях, законодавстві або нашій діяльності. Будь ласка, періодично переглядайте цю сторінку, щоб бути в курсі того, як ми використовуємо cookie-файли.
          </p>
        </section>

        <section id="contact">
          <h2>Контакти</h2>
          <p>
            Якщо у вас є питання щодо нашого використання cookie-файлів, будь ласка, зв'яжіться з нами:
          </p>
          <ul>
            <li><strong>Email:</strong> privacy@dekop.ua</li>
            <li><strong>Загальний контакт:</strong> contact@dekop.ua</li>
          </ul>
        </section>

        <div className={styles.relatedLinks}>
          <h3>Пов'язані документи:</h3>
          <ul>
            <li><Link href="/privacy">Повна Політика конфіденційності</Link></li>
          </ul>
        </div>

        <div className={styles.footer}>
          <p><strong>Останнє оновлення:</strong> 29 листопада 2024 року</p>
          <p><strong>Dekop Furniture Enterprise</strong> - Ваш надійний партнер у світі меблів</p>
        </div>
      </div>
    </div>
  );
}
