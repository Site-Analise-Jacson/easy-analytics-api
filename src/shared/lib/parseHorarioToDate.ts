import moment from 'moment-timezone';

export function parseHorarioToDate(input: string): Date | null {
    if (!input || typeof input !== "string") return null;

    // Aceita "HH:MM" ou "HH.MM"
    const normalized = input.replace(".", ":");

    const [hoursStr, minutesStr] = normalized.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    const now = new Date();

    const nowUtc = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds(),
            now.getUTCMilliseconds()
        )
    );

    let resultDate = new Date(
        Date.UTC(
            nowUtc.getUTCFullYear(),
            nowUtc.getUTCMonth(),
            nowUtc.getUTCDate(),
            hours,
            minutes,
            0,
            0
        )
    );

    if (resultDate > nowUtc) {
        resultDate.setUTCDate(resultDate.getUTCDate() - 1);
    }

    return resultDate;
}

export function parseHorarioToDateBet365(input: string): Date | null {
    if (!input || typeof input !== "string") return null;

    const normalized = input.replace(".", ":");
    const [hoursStr, minutesStr] = normalized.split(":");

    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    const now = new Date();

    // Create date in UTC using today's date (UTC)
    let resultDate = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0
    ));

    // 🕒 Adjust +3 hours for Brasil timezone (UTC-3 → UTC)
    resultDate.setUTCHours(resultDate.getHours() + 3);


    return resultDate;
}


export function parseHorarioToDatev2(input: string): Date | null {
    if (!input || typeof input !== "string") return null;

    const normalized = input.replace(".", ":");
    const [hoursStr, minutesStr] = normalized.split(":");
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    // Cria a data no timezone de São Paulo
    let resultMoment = moment.tz({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0,
        year: moment().year(),
        month: moment().month(),
        day: moment().date()
    }, "America/Sao_Paulo");

    // Se for no futuro (i.e., hora maior que a hora atual), subtrai um dia
    if (resultMoment.isAfter(moment.tz("America/Sao_Paulo"))) {
        resultMoment = resultMoment.subtract(1, 'day');
    }

    return resultMoment.toDate();
}